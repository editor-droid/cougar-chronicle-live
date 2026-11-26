import Link from 'next/link';
import { getByuScores } from '@/lib/scores/get-byu-scores';
import { formatDenver, formatLiveStatus, formatPlace, formatResult } from '@/lib/scores/format';
import { gameHref, teamHref } from '@/lib/scores/paths';
import { getStandings } from '@/lib/scores/page-data';
import type { ConferenceTable } from '@/lib/scores/standings';
import type { ScoreGame, SportKey, SportScores } from '@/lib/scores/types';

function sportList(payload: {
  football: SportScores | null;
  basketball: SportScores | null;
  womensBasketball: SportScores | null;
  soccer: SportScores | null;
}): SportScores[] {
  return [payload.football, payload.basketball, payload.womensBasketball, payload.soccer].filter(
    (sport): sport is SportScores => sport != null,
  );
}

export default async function SportsScoreboard() {
  const payload = await getByuScores();
  if (!payload) {
    return <p className="sports-note">Scores are temporarily unavailable.</p>;
  }
  const sports = sportList(payload);
  if (sports.length === 0) {
    return <p className="sports-note">Scores are temporarily unavailable.</p>;
  }
  const tables = await Promise.all(sports.map((sport) => getStandings(sport.key)));
  const live = sports.flatMap((sport) => (sport.live ? [{ sport, game: sport.live }] : []));

  return (
    <section className="sports-board" aria-label="BYU scoreboard">
      {live.length > 0 ? (
        <div className="sports-live-list">
          {live.map(({ sport, game }) => (
            <Link key={game.id} href={gameHref(sport.key, game.id)} className="sports-live">
              <span className="byu-scores__dot" aria-hidden="true" />
              <span>Live · {sport.label}</span>
              <strong>
                BYU {game.byuScore ?? '–'} · {game.opponentAbbrev} {game.opponentScore ?? '–'}
              </strong>
              <span>{formatLiveStatus(game, sport.key)}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {sports.map((sport, index) => (
        <SportBlock key={sport.key} sport={sport} table={tables[index] ?? null} />
      ))}

      <p className="sports-note">
        Independent student coverage. The Cougar Chronicle is not affiliated with Brigham Young University.
      </p>
    </section>
  );
}

function SportBlock({ sport, table }: { sport: SportScores; table: ConferenceTable | null }) {
  const finals = sport.games.filter((game) => game.state === 'post').slice(-4).reverse();
  const upcoming = sport.games.filter((game) => game.state === 'pre').slice(0, 4);
  const meta = [sport.record, sport.standing].filter(Boolean).join(' · ');

  return (
    <article className="sports-sport">
      <header className="sports-sport__head">
        <h2 className="font-serif">
          <Link href={teamHref(sport.key)}>{sport.label}</Link>
        </h2>
        {meta ? <p>{meta}</p> : null}
      </header>
      <ul className="sports-games">
        {sport.live ? <GameItem sport={sport.key} game={sport.live} kind="Live" /> : null}
        {finals.map((game) => (
          <GameItem key={game.id} sport={sport.key} game={game} kind="Final" />
        ))}
        {upcoming.map((game) => (
          <GameItem key={game.id} sport={sport.key} game={game} kind="Upcoming" />
        ))}
        {finals.length === 0 && upcoming.length === 0 && !sport.live ? (
          <li className="sports-note">No games on the schedule.</li>
        ) : null}
      </ul>
      {table && table.rows.length > 0 ? <Standings table={table} /> : null}
    </article>
  );
}

function GameItem({ sport, game, kind }: { sport: SportKey; game: ScoreGame; kind: string }) {
  const when = formatDenver(game.start);
  const detail = game.state === 'post'
    ? formatResult(game)
    : game.state === 'in'
      ? formatLiveStatus(game, sport)
      : [when.date, when.time, game.tv].filter(Boolean).join(' · ');
  return (
    <li>
      <Link href={gameHref(sport, game.id)}>
        <span className="sports-games__kind">{kind}</span>
        <span>{formatPlace(game)}</span>
        <span className={game.byuWinner === true ? 'is-win' : game.byuWinner === false ? 'is-loss' : ''}>
          {detail}
        </span>
      </Link>
    </li>
  );
}

function Standings({ table }: { table: ConferenceTable }) {
  return (
    <div className="sports-table-wrap">
      <table className="sports-table">
        <caption>{table.name}</caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">Conf</th>
            <th scope="col">Overall</th>
            <th scope="col">GB</th>
            <th scope="col">Streak</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.teamId} className={row.byu ? 'is-byu' : undefined}>
              <th scope="row">{row.team}</th>
              <td>{row.conference ?? ''}</td>
              <td>{row.overall ?? ''}</td>
              <td>{row.gamesBehind ?? ''}</td>
              <td>{row.streak ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import Link from 'next/link';
import { getByuScores } from '@/lib/scores/get-byu-scores';
import { formatDenver, formatLiveStatus, formatPlace, formatResult } from '@/lib/scores/format';
import { gameHref, SPORT_SPECS, teamHref } from '@/lib/scores/paths';
import type { ScoreGame, SportKey, SportScores } from '@/lib/scores/types';

function sportList(payload: {
  football: SportScores | null;
  basketball: SportScores | null;
  womensBasketball: SportScores | null;
  soccer: SportScores | null;
}): SportScores[] {
  const rank = (sport: SportScores) =>
    sport.live ? 0 : sport.next ? Date.parse(sport.next.start) || Infinity : Infinity;
  return [payload.football, payload.basketball, payload.womensBasketball, payload.soccer]
    .filter((sport): sport is SportScores => sport != null)
    .sort((a, b) => rank(a) - rank(b));
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
  const live = sports.flatMap((sport) => (sport.live ? [{ sport, game: sport.live }] : []));

  return (
    <section className="sports-board" aria-label="BYU scoreboard">
      <nav className="sports-teams" aria-label="Teams">
        {Object.values(SPORT_SPECS).map((spec) => (
          <Link key={spec.key} href={teamHref(spec.key)} className="sports-teams__link">
            {spec.label}
          </Link>
        ))}
      </nav>
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

      {sports.map((sport) => (
        <SportBlock key={sport.key} sport={sport} />
      ))}

      <p className="sports-note">
        Independent student coverage. The Cougar Chronicle is not affiliated with Brigham Young University.
      </p>
    </section>
  );
}

function SportBlock({ sport }: { sport: SportScores }) {
  const meta = [sport.record, sport.standing].filter(Boolean).join(' · ');
  const last = sport.live ? null : sport.last;

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
        {last ? <GameItem sport={sport.key} game={last} kind="Last game" /> : null}
        {sport.next ? <GameItem sport={sport.key} game={sport.next} kind="Next game" /> : null}
        {!sport.live && !last && !sport.next ? (
          <li className="sports-note">No games on the schedule.</li>
        ) : null}
      </ul>
      <p className="sports-sport__more">
        <Link href={teamHref(sport.key)}>Full schedule, stats &amp; standings →</Link>
      </p>
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

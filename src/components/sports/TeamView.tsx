import Link from 'next/link';
import { formatDenver, formatPlace, formatResult } from '@/lib/scores/format';
import { gameHref } from '@/lib/scores/paths';
import type { SeasonSnapshot } from '@/lib/scores/page-data';
import type { ConferenceTable } from '@/lib/scores/standings';
import type { LinkedStory } from '@/lib/scores/story-query';
import type { SportScores } from '@/lib/scores/types';

export default function TeamView({
  sport,
  table,
  season,
  stories,
}: {
  sport: SportScores;
  table: ConferenceTable | null;
  season: SeasonSnapshot;
  stories: LinkedStory[];
}) {
  const meta = [sport.record, sport.rank ? `#${sport.rank}` : null, sport.standing].filter(Boolean).join(' · ');

  return (
    <article className="team-page">
      <nav aria-label="Breadcrumb" className="sports-crumb">
        <Link href="/sports">Sports</Link>
        <span aria-hidden="true">/</span>
        <span>{sport.label}</span>
      </nav>
      <header className="game-page__head">
        <p className="sports-kicker">BYU</p>
        <h1 className="font-serif">{sport.label}</h1>
        {meta ? <p className="game-page__status">{meta}</p> : null}
      </header>

      <section>
        <h2 className="font-serif">Schedule and results</h2>
        {sport.games.length === 0 ? (
          <p className="sports-note">No games on the schedule.</p>
        ) : (
          <div className="sports-table-wrap">
            <table className="sports-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Opponent</th>
                  <th scope="col">Result</th>
                  <th scope="col">TV</th>
                </tr>
              </thead>
              <tbody>
                {sport.games.map((game) => {
                  const when = formatDenver(game.start);
                  const result = game.state === 'post'
                    ? formatResult(game)
                    : game.state === 'in'
                      ? 'Live'
                      : when.time || 'TBD';
                  return (
                    <tr key={game.id} className={game.state === 'in' ? 'is-byu' : undefined}>
                      <td>{when.date}</td>
                      <th scope="row">
                        <Link href={gameHref(sport.key, game.id)}>{formatPlace(game)}</Link>
                      </th>
                      <td className={game.byuWinner === true ? 'is-win' : game.byuWinner === false ? 'is-loss' : ''}>
                        {result}
                      </td>
                      <td>{game.tv ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {table && table.rows.length > 0 ? (
        <section>
          <h2 className="font-serif">Standings</h2>
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
        </section>
      ) : null}

      {season.leaders.length > 0 ? (
        <section>
          <h2 className="font-serif">Season stat leaders</h2>
          <ul className="sports-leaders">
            {season.leaders.map((leader) => (
              <li key={leader.category}>
                <span>{leader.category}</span>
                <strong>{leader.name}</strong>
                <span>{leader.line}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {season.averages.length > 0 ? (
        <section>
          <h2 className="font-serif">Team averages</h2>
          <dl className="game-facts">
            {season.averages.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {stories.length > 0 ? (
        <section className="sports-stories">
          <h2 className="font-serif">Latest stories</h2>
          <ul>
            {stories.map((story) => (
              <li key={story.id}>
                <Link href={story.href}>{story.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="sports-note">
        Independent student coverage. The Cougar Chronicle is not affiliated with Brigham Young University.
        {' '}
        <Link href="/sports">All sports</Link>
      </p>
    </article>
  );
}

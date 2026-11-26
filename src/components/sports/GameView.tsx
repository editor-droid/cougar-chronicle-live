import Link from 'next/link';
import LiveRefresher from '@/components/sports/LiveRefresher';
import { formatDenver, formatLiveStatus, formatResult } from '@/lib/scores/format';
import { teamHref } from '@/lib/scores/paths';
import { buildPregameBlurb, matchupPhrase } from '@/lib/scores/seo';
import type { LinkedStory } from '@/lib/scores/story-query';
import type { GamePageData } from '@/lib/scores/page-data';
import type { BoxSide, LinescoreRow, Performer, StatRow } from '@/lib/scores/summary';

export default function GameView({ page, stories }: { page: GamePageData; stories: LinkedStory[] }) {
  const { game, sport, summary } = page;
  const when = formatDenver(game.start);
  const byuRecord = summary?.byuRecord ?? sport.record;
  const opponentRecord = summary?.opponentRecord ?? null;
  const blurb = buildPregameBlurb(game, byuRecord, opponentRecord);
  const started = game.state !== 'pre';
  const score = game.byuScore != null && game.opponentScore != null
    ? `BYU ${game.byuScore} – ${game.opponent} ${game.opponentScore}`
    : null;
  const status = game.state === 'in'
    ? `Live · ${formatLiveStatus(game, sport.key)}`
    : game.state === 'post'
      ? (game.statusText || 'Final')
      : 'Upcoming';

  return (
    <article className="game-page">
      <LiveRefresher active={game.state === 'in'} />
      <nav aria-label="Breadcrumb" className="sports-crumb">
        <Link href="/sports">Sports</Link>
        <span aria-hidden="true">/</span>
        <Link href={teamHref(sport.key)}>{sport.label}</Link>
        <span aria-hidden="true">/</span>
        <span>{matchupPhrase(game)}</span>
      </nav>

      <header className="game-page__head">
        <p className="sports-kicker">{sport.label}</p>
        <h1 className="font-serif">{matchupPhrase(game)}</h1>
        <p className={`game-page__status${game.state === 'in' ? ' is-live' : ''}`}>
          {game.state === 'in' ? <span className="byu-scores__dot" aria-hidden="true" /> : null}
          {status}
          {game.state === 'post' && score ? ` · ${formatResult(game)}` : ''}
        </p>
        {score ? <p className="game-page__score">{score}</p> : null}
        <dl className="game-facts">
          <Fact label="When" value={when.date === 'TBD' ? null : `${when.date}${when.time ? ` · ${when.time}` : ''}`} />
          <Fact label="TV" value={game.tv} />
          <Fact label="Line" value={summary?.line ?? null} />
          <Fact label="Over/under" value={summary?.overUnder != null ? String(summary.overUnder) : null} />
          <Fact label="Venue" value={game.venue} />
          <Fact label="BYU" value={byuRecord} />
          <Fact label={game.opponent} value={opponentRecord} />
          <Fact
            label="Attendance"
            value={summary?.attendance ? summary.attendance.toLocaleString('en-US') : null}
          />
        </dl>
      </header>

      {blurb ? <p className="game-page__preview">{blurb}</p> : null}
      {started && summary && summary.linescores.length > 0 ? (
        <Linescore lines={summary.linescores} game={game} opponent={game.opponent} />
      ) : null}
      {started && summary && summary.performers.length > 0 ? (
        <Performers rows={summary.performers} opponent={game.opponent} />
      ) : null}
      {started && summary && summary.teamStats.length > 0 ? (
        <StatTable rows={summary.teamStats} opponent={game.opponent} />
      ) : null}
      {started && summary && summary.box.length > 0 ? <BoxScore sides={summary.box} /> : null}

      {stories.length > 0 ? (
        <section className="sports-stories">
          <h2 className="font-serif">Chronicle stories</h2>
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
      </p>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Linescore({
  lines,
  game,
  opponent,
}: {
  lines: LinescoreRow[];
  game: GamePageData['game'];
  opponent: string;
}) {
  const showTotal = game.byuScore != null && game.opponentScore != null;
  return (
    <section>
      <h2 className="font-serif">Scoring by period</h2>
      <div className="sports-table-wrap">
        <table className="sports-table">
          <thead>
            <tr>
              <th scope="col">Team</th>
              {lines.map((line) => (
                <th key={line.label} scope="col">{line.label}</th>
              ))}
              {showTotal ? <th scope="col">T</th> : null}
            </tr>
          </thead>
          <tbody>
            <tr className="is-byu">
              <th scope="row">BYU</th>
              {lines.map((line) => <td key={line.label}>{line.byu}</td>)}
              {showTotal ? <td>{game.byuScore}</td> : null}
            </tr>
            <tr>
              <th scope="row">{opponent}</th>
              {lines.map((line) => <td key={line.label}>{line.opponent}</td>)}
              {showTotal ? <td>{game.opponentScore}</td> : null}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Performers({ rows, opponent }: { rows: Performer[]; opponent: string }) {
  return (
    <section>
      <h2 className="font-serif">Top performers</h2>
      <ul className="sports-leaders">
        {rows.map((row) => (
          <li key={`${row.side}-${row.category}-${row.name}`}>
            <span>{row.category}</span>
            <strong>{row.name}</strong>
            <span>{row.side === 'byu' ? 'BYU' : opponent}</span>
            <span>{row.line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatTable({ rows, opponent }: { rows: StatRow[]; opponent: string }) {
  return (
    <section>
      <h2 className="font-serif">Team stats</h2>
      <div className="sports-table-wrap">
        <table className="sports-table">
          <thead>
            <tr>
              <th scope="col">BYU</th>
              <th scope="col">Stat</th>
              <th scope="col">{opponent}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.byu}</td>
                <th scope="row">{row.label}</th>
                <td>{row.opponent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BoxScore({ sides }: { sides: BoxSide[] }) {
  return (
    <section>
      <h2 className="font-serif">Box score</h2>
      {sides.map((side) => (
        <div key={side.name}>
          <h3 className="font-serif">{side.name}</h3>
          {side.groups.map((group) => (
            <div key={group.title} className="sports-table-wrap">
              <table className="sports-table sports-table--box">
                <caption>{group.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Player</th>
                    {group.labels.map((label) => (
                      <th key={label} scope="col">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">{row.name}</th>
                      {group.labels.map((label, index) => (
                        <td key={label}>{row.stats[index] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

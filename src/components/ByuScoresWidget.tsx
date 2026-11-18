'use client';

import { useEffect, useState } from 'react';
import { formatDenver, formatLiveStatus, formatPlace, formatResult } from '@/lib/scores/format';
import type { ByuScoresPayload, ScoreGame, SportKey, SportScores } from '@/lib/scores/types';

type ScoresResponse = { show: true } & ByuScoresPayload;

function isScoresResponse(value: unknown): value is ScoresResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as { show?: unknown; football?: unknown; basketball?: unknown };
  return record.show === true && (record.football != null || record.basketball != null);
}

export default function ByuScoresWidget() {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'hidden'>('loading');
  const [data, setData] = useState<ScoresResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const response = await fetch('/api/scores', { cache: 'no-store' });
        if (!response.ok) throw new Error('scores unavailable');
        const json: unknown = await response.json();
        if (cancelled) return;
        if (!isScoresResponse(json)) {
          setPhase((current) => (current === 'ready' ? current : 'hidden'));
          return;
        }
        setData(json);
        setPhase('ready');
        const delay = Math.min(Math.max(json.revalidateSeconds, 30), 20 * 60) * 1000;
        timer = setTimeout(load, delay);
      } catch {
        if (!cancelled) setPhase((current) => (current === 'ready' ? current : 'hidden'));
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <section className="byu-scores" aria-label="BYU scores and schedule" aria-busy={phase === 'loading'}>
      {phase === 'loading' || !data ? <ScoresSkeleton /> : <ScoresCard data={data} />}
    </section>
  );
}

function ScoresSkeleton() {
  return (
    <>
      <h2 className="widget-title">BYU Scores</h2>
      <div className="byu-scores__tabs" aria-hidden="true">
        <span className="byu-scores__tab is-active">Football</span>
        <span className="byu-scores__tab">Men&apos;s Basketball</span>
      </div>
      <div className="byu-scores__row byu-scores__placeholder" />
      <div className="byu-scores__row byu-scores__row-next byu-scores__placeholder" />
    </>
  );
}

function ScoresCard({ data }: { data: ScoresResponse }) {
  const sports = [data.football, data.basketball].filter((sport): sport is SportScores => sport !== null);
  const initial = sports.find((sport) => sport.live)?.key ?? sports[0]?.key ?? 'football';
  const [active, setActive] = useState<SportKey>(initial);
  const sport = sports.find((item) => item.key === active) ?? sports[0];
  if (!sport) return null;

  return (
    <>
      <div className="byu-scores__head">
        <h2 className="widget-title">BYU Scores</h2>
        {data.stale ? <span className="byu-scores__stale">Delayed</span> : null}
      </div>
      {sports.length > 1 ? (
        <div className="byu-scores__tabs" role="tablist" aria-label="Sport">
          {sports.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={item.key === sport.key}
              className={`byu-scores__tab${item.key === sport.key ? ' is-active' : ''}`}
              onClick={() => setActive(item.key)}
            >
              {item.key === 'football' ? 'Football' : 'MBB'}
              {item.live ? <span className="byu-scores__tab-live">Live</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="byu-scores__sport-label">{sport.label}</p>
      )}

      {sport.live ? <LiveLine game={sport.live} sport={sport.key} /> : null}
      {sport.last ? (
        <GameRow label="Last" game={sport.last} detail={formatResult(sport.last)} />
      ) : null}
      {sport.next ? <NextRow game={sport.next} /> : null}
      {!sport.last && !sport.next && !sport.live ? (
        <p className="byu-scores__empty">No games on the schedule.</p>
      ) : null}

      <details className="byu-scores__more">
        <summary>Full schedule</summary>
        <p className="byu-scores__meta">
          {[sport.record, sport.rank ? `#${sport.rank}` : null, sport.standing].filter(Boolean).join(' · ') || 'BYU'}
        </p>
        {sport.upcoming.length > 0 ? (
          <ul className="byu-scores__list">
            {sport.upcoming.map((game) => {
              const when = formatDenver(game.start);
              return (
                <li key={game.id}>
                  <span>{formatPlace(game)}</span>
                  <span className="byu-scores__when">
                    {when.date} · {when.time}
                    {game.tv ? ` · ${game.tv}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="byu-scores__empty">No further games listed.</p>
        )}
        <p className="byu-scores__links">
          {sport.liveStatsUrl ? (
            <a href={sport.liveStatsUrl} target="_blank" rel="noopener noreferrer">Live stats</a>
          ) : null}
          <a href={sport.scheduleUrl} target="_blank" rel="noopener noreferrer">
            {sport.liveStatsUrl ? 'Full schedule' : 'Schedule on BYUCougars.com'}
          </a>
        </p>
      </details>
    </>
  );
}

function LiveLine({ game, sport }: { game: ScoreGame; sport: SportKey }) {
  return (
    <div className="byu-scores__live" role="status">
      <div className="byu-scores__live-kicker">
        <span className="byu-scores__dot" aria-hidden="true" />
        Live · {formatLiveStatus(game, sport)}
        {game.tv ? ` · ${game.tv}` : ''}
      </div>
      <p className="byu-scores__live-score">
        <span>BYU {game.byuScore ?? '–'}</span>
        <span>{game.opponentAbbrev} {game.opponentScore ?? '–'}</span>
      </p>
    </div>
  );
}

function GameRow({ label, game, detail }: { label: string; game: ScoreGame; detail: string }) {
  const mark = game.byuWinner === true ? 'is-win' : game.byuWinner === false ? 'is-loss' : '';
  return (
    <div className="byu-scores__row">
      <span className="byu-scores__label">{label}</span>
      <span className={`byu-scores__result ${mark}`}>{detail}</span>
      <span className="byu-scores__opp">{formatPlace(game)}</span>
    </div>
  );
}

function NextRow({ game }: { game: ScoreGame }) {
  const when = formatDenver(game.start);
  return (
    <div className="byu-scores__row byu-scores__row-next">
      <span className="byu-scores__label">Next</span>
      <span className="byu-scores__opp">{formatPlace(game)}</span>
      <span className="byu-scores__when">
        {when.date} · {when.time}
        {game.tv ? ` · ${game.tv}` : ''}
      </span>
    </div>
  );
}

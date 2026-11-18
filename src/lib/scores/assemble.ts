import { COLD_REVALIDATE_SECONDS, HOT_REVALIDATE_SECONDS, HOT_WINDOW_MS } from './constants';
import type { ScoreGame, SportKey, SportScores } from './types';

export function selectGames(games: ScoreGame[]): {
  live: ScoreGame | null;
  last: ScoreGame | null;
  next: ScoreGame | null;
  upcoming: ScoreGame[];
} {
  const unique = new Map<string, ScoreGame>();
  for (const game of games) unique.set(game.id, game);
  const ordered = [...unique.values()].sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start)
  );
  const live = [...ordered].reverse().find((game) => game.state === 'in') ?? null;
  const finals = ordered.filter((game) => game.state === 'post');
  const last = finals.length > 0 ? finals[finals.length - 1] : null;
  const upcomingAll = ordered.filter((game) => game.state === 'pre' && game.id !== live?.id);
  const next = upcomingAll[0] ?? null;
  const upcoming = upcomingAll.slice(1, 5);
  return { live, last, next, upcoming };
}

export function buildSport(input: {
  key: SportKey;
  label: string;
  games: ScoreGame[];
  record: string | null;
  standing: string | null;
  scheduleUrl: string;
}): SportScores | null {
  if (input.games.length === 0 && !input.record && !input.standing) return null;
  const { live, last, next, upcoming } = selectGames(input.games);
  const rank = live?.byuRank ?? next?.byuRank ?? last?.byuRank ?? null;
  return {
    key: input.key,
    label: input.label,
    record: input.record,
    standing: input.standing,
    rank,
    live,
    last,
    next,
    upcoming,
    scheduleUrl: input.scheduleUrl,
    liveStatsUrl: live?.statBroadcastUrl ?? null,
  };
}

/**
 * Live game first. Otherwise the sport whose next game starts soonest.
 * A sport with only a past result is last, most recent result first.
 */
export function preferredSport(sports: SportScores[]): SportScores | null {
  if (sports.length === 0) return null;
  const rank = (sport: SportScores): [number, number] => {
    if (sport.live) return [0, -(Date.parse(sport.live.start) || 0)];
    if (sport.next) return [1, Date.parse(sport.next.start) || Number.POSITIVE_INFINITY];
    if (sport.last) return [2, -(Date.parse(sport.last.start) || 0)];
    return [3, 0];
  };
  return sports.reduce((best, sport) => {
    const [tier, time] = rank(sport);
    const [bestTier, bestTime] = rank(best);
    if (tier !== bestTier) return tier < bestTier ? sport : best;
    return time < bestTime ? sport : best;
  });
}

export function chooseRevalidateSeconds(
  sports: Array<SportScores | null>,
  now: number
): number {
  for (const sport of sports) {
    if (!sport) continue;
    if (sport.live) return HOT_REVALIDATE_SECONDS;
    if (!sport.next) continue;
    const start = Date.parse(sport.next.start);
    if (!Number.isFinite(start)) continue;
    const delta = start - now;
    if (delta <= HOT_WINDOW_MS && delta >= -30 * 60 * 1000) return HOT_REVALIDATE_SECONDS;
  }
  return COLD_REVALIDATE_SECONDS;
}

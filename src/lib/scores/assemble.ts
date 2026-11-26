import { COLD_REVALIDATE_SECONDS, HOT_REVALIDATE_SECONDS, HOT_WINDOW_MS } from './constants';
import type { ScoreGame, SportKey, SportScores } from './types';

export function orderGames(games: ScoreGame[]): ScoreGame[] {
  const unique = new Map<string, ScoreGame>();
  for (const game of games) unique.set(game.id, game);
  return [...unique.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/** W-L, or W-L-T when a final has no winner (soccer draws). */
export function recordFromGames(games: ScoreGame[]): string | null {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const game of games) {
    if (game.state !== 'post') continue;
    if (game.byuWinner === true) wins += 1;
    else if (game.byuWinner === false) losses += 1;
    else if (game.byuScore != null && game.opponentScore != null) ties += 1;
  }
  if (wins + losses + ties === 0) return null;
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export function selectGames(games: ScoreGame[]): {
  live: ScoreGame | null;
  last: ScoreGame | null;
  next: ScoreGame | null;
  upcoming: ScoreGame[];
} {
  const ordered = orderGames(games);
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
  seasonYear?: number | null;
}): SportScores | null {
  const ordered = orderGames(input.games);
  const record = input.record || recordFromGames(ordered);
  if (ordered.length === 0 && !record && !input.standing) return null;
  const { live, last, next, upcoming } = selectGames(ordered);
  const rank = live?.byuRank ?? next?.byuRank ?? last?.byuRank ?? null;
  return {
    key: input.key,
    label: input.label,
    record,
    standing: input.standing,
    rank,
    live,
    last,
    next,
    upcoming,
    scheduleUrl: input.scheduleUrl,
    liveStatsUrl: live?.statBroadcastUrl ?? null,
    games: ordered,
    seasonYear: input.seasonYear ?? null,
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

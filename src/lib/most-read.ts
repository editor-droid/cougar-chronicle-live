/**
 * Most-read ranking from daily view buckets.
 *
 * PostViewDaily stores one count per post per UTC date, so a rolling 24-hour
 * window cannot split a calendar day. The 24h list includes every UTC date
 * the window touches (today, and yesterday once the window crosses midnight).
 * That covers every view from the last 24 hours and can also include earlier
 * hours of the previous UTC day. When that window is too thin, the same
 * buckets are summed across the rolling 7 days. Callers keep the all-time
 * Post.views list when both windows are still too thin.
 */

export const MOST_READ_MIN_POSTS = 3;
export const MOST_READ_MIN_VIEWS = 8;
export const MOST_READ_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MOST_READ_FALLBACK_MS = 7 * 24 * 60 * 60 * 1000;
/** Shared cache lifetime for the daily + all-time reads. */
export const MOST_READ_REVALIDATE_SECONDS = 300;

const DAY_MS = 24 * 60 * 60 * 1000;

export type MostReadWindow = '24h' | '7d' | 'all-time';

export type RankableView = {
  postId: string;
  /** UTC date key, YYYY-MM-DD. */
  date: string;
  count: number;
  isPremium?: boolean;
  printEditionId?: string | null;
  /** ISO timestamp. Null when the post has no publishedAt. */
  publishedAt?: string | null;
};

export type MostReadRankOptions = {
  now: Date;
  take: number;
  excludePrint?: boolean;
  excludePremium?: boolean;
  excludeIds?: readonly string[];
  /** Match homepage trending: publishedAt <= now. Null publishedAt is excluded. */
  publishedByNow?: boolean;
};

export type MostReadSelection = {
  window: MostReadWindow;
  /** Empty when the window is all-time; the caller uses Post.views order. */
  ranking: { postId: string; views: number }[];
};

/** UTC calendar day at 00:00:00.000Z. This is the PostViewDaily.date value. */
export function utcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function utcDateKey(date: Date): string {
  return utcDay(date).toISOString().slice(0, 10);
}

/**
 * Inclusive UTC date keys that intersect [now - windowMs, now].
 * Daily buckets cannot be sliced inside a date, so the oldest key is the
 * UTC date of the window start, not a partial day.
 */
export function dateKeysCovering(now: Date, windowMs: number): Set<string> {
  const start = new Date(now.getTime() - windowMs);
  const keys = new Set<string>();
  let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (; cursor <= end; cursor += DAY_MS) {
    keys.add(new Date(cursor).toISOString().slice(0, 10));
  }
  return keys;
}

function eligible(row: RankableView, opts: MostReadRankOptions, now: Date): boolean {
  if (!row.postId || row.count <= 0) return false;
  if (opts.excludePrint && row.printEditionId) return false;
  if (opts.excludePremium && row.isPremium) return false;
  if (opts.publishedByNow) {
    if (!row.publishedAt) return false;
    const published = new Date(row.publishedAt).getTime();
    if (!Number.isFinite(published) || published > now.getTime()) return false;
  }
  return true;
}

function totals(
  rows: readonly RankableView[],
  keys: Set<string>,
  opts: MostReadRankOptions,
  now: Date
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!keys.has(row.date)) continue;
    if (!eligible(row, opts, now)) continue;
    map.set(row.postId, (map.get(row.postId) ?? 0) + row.count);
  }
  return map;
}

/** Surface rules (print, premium, publish time) decide if a window is full.
 *  The story currently on screen is removed after that, so reading it does
 *  not by itself force the all-time list. */
function withoutExcluded(
  map: Map<string, number>,
  opts: MostReadRankOptions
): { postId: string; views: number }[] {
  const hidden = new Set(opts.excludeIds ?? []);
  const visible = new Map<string, number>();
  for (const [postId, views] of map) {
    if (!hidden.has(postId)) visible.set(postId, views);
  }
  return rank(visible, opts.take);
}

function enough(map: Map<string, number>): boolean {
  if (map.size < MOST_READ_MIN_POSTS) return false;
  let sum = 0;
  for (const count of map.values()) sum += count;
  return sum >= MOST_READ_MIN_VIEWS;
}

function rank(map: Map<string, number>, take: number): { postId: string; views: number }[] {
  return [...map.entries()]
    .map(([postId, views]) => ({ postId, views }))
    .sort((a, b) => b.views - a.views || (a.postId < b.postId ? -1 : a.postId > b.postId ? 1 : 0))
    .slice(0, Math.max(0, take));
}

/**
 * Pick the 24h ranking when it has enough posts and views.
 * Otherwise use the rolling 7-day ranking when that is enough.
 * Otherwise signal all-time so the existing Post.views list stays on screen.
 */
export function selectMostRead(
  rows: readonly RankableView[],
  opts: MostReadRankOptions
): MostReadSelection {
  const now = opts.now;
  const recent = totals(rows, dateKeysCovering(now, MOST_READ_WINDOW_MS), opts, now);
  if (enough(recent)) {
    const ranking = withoutExcluded(recent, opts);
    if (ranking.length > 0) return { window: '24h', ranking };
  }
  const week = totals(rows, dateKeysCovering(now, MOST_READ_FALLBACK_MS), opts, now);
  if (enough(week)) {
    const ranking = withoutExcluded(week, opts);
    if (ranking.length > 0) return { window: '7d', ranking };
  }
  return { window: 'all-time', ranking: [] };
}

export function mostReadHeading(window: MostReadWindow, variant: 'home' | 'sidebar'): string {
  if (window === '24h') return variant === 'home' ? 'Most read today' : 'Most Read Today';
  if (window === '7d') return variant === 'home' ? 'Most read this week' : 'Most Read This Week';
  return variant === 'home' ? 'Most popular' : 'Most Read';
}

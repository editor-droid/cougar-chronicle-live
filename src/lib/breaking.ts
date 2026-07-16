/** Default banner duration when editors enable Breaking without picking a window. */
export const DEFAULT_BREAKING_HOURS = 24;

/** Compute absolute expiry from “now + hours”. */
export function computeBreakingUntil(hours?: number | null): Date {
  const n = Number(hours);
  const safe = Number.isFinite(n) && n > 0 ? n : DEFAULT_BREAKING_HOURS;
  return new Date(Date.now() + safe * 60 * 60 * 1000);
}

/**
 * Whether a post should still show as breaking (site banner + article badge).
 * - Prefer explicit `breakingUntil`.
 * - Legacy rows with isBreaking but null until: treat as 24h from publishedAt.
 */
export function isBreakingStillActive(
  post: {
    isBreaking?: boolean | null;
    breakingUntil?: Date | string | null;
    publishedAt?: Date | string | null;
  },
  now: Date = new Date()
): boolean {
  if (!post.isBreaking) return false;

  if (post.breakingUntil) {
    return new Date(post.breakingUntil).getTime() > now.getTime();
  }

  // Legacy: no expiry stored → 24h from publish time
  if (!post.publishedAt) return false;
  const start = new Date(post.publishedAt).getTime();
  return start + DEFAULT_BREAKING_HOURS * 60 * 60 * 1000 > now.getTime();
}

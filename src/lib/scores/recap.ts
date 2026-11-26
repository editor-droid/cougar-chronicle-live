import { formatResult } from './format';
import { matchupPhrase } from './seo';
import type { ScoreGame, SportKey } from './types';
import type { GameSummary } from './summary';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Finals older than this are left alone so the first deploy does not backfill the season. */
export const RECAP_WINDOW_MS = 3 * DAY_MS;

export function shouldCreateRecap(game: ScoreGame, now: number): boolean {
  if (game.state !== 'post') return false;
  const start = Date.parse(game.start);
  if (!Number.isFinite(start)) return false;
  const age = now - start;
  return age >= 0 && age <= RECAP_WINDOW_MS;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function recapTitle(game: ScoreGame): string {
  return `DRAFT: ${matchupPhrase(game)} recap`;
}

export function recapSlug(sport: SportKey, eventId: string): string {
  return `recap-${sport}-${eventId}`;
}

/** Unpublished starter. The cron never sets a publish time or published state. */
export function buildRecapHtml(game: ScoreGame, summary: GameSummary | null): string {
  const score = game.byuScore && game.opponentScore
    ? `Final: BYU ${escapeHtml(game.byuScore)}, ${escapeHtml(game.opponent)} ${escapeHtml(game.opponentScore)} (${escapeHtml(formatResult(game))}).`
    : 'Final score was not on the feed.';
  const parts = [
    '<p><strong>Draft for a writer. Do not publish this starter as-is.</strong> Score and stats below were filled in after the game ended. Replace this note with the story.</p>',
    `<p>${score}</p>`,
  ];
  const stats = summary?.teamStats ?? [];
  if (stats.length > 0) {
    const items = stats.map((row) => (
      `<li>${escapeHtml(row.label)}: BYU ${escapeHtml(row.byu)}, ${escapeHtml(game.opponent)} ${escapeHtml(row.opponent)}</li>`
    ));
    parts.push(`<h2>Team stats</h2><ul>${items.join('')}</ul>`);
  }
  const performers = summary?.performers ?? [];
  if (performers.length > 0) {
    const items = performers.map((row) => {
      const side = row.side === 'byu' ? 'BYU' : game.opponent;
      return `<li>${escapeHtml(row.category)}: ${escapeHtml(row.name)} (${escapeHtml(side)}) ${escapeHtml(row.line)}</li>`;
    });
    parts.push(`<h2>Top performers</h2><ul>${items.join('')}</ul>`);
  }
  return parts.join('');
}

export function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === 'P2002';
}

/**
 * One draft per event. A unique collision from a concurrent cron is "already created", not an error.
 */
export async function ensureRecap(
  eventId: string,
  deps: {
    findExisting: (eventId: string) => Promise<boolean>;
    insert: (eventId: string) => Promise<void>;
  },
): Promise<'created' | 'exists'> {
  if (await deps.findExisting(eventId)) return 'exists';
  try {
    await deps.insert(eventId);
    return 'created';
  } catch (error) {
    if (isUniqueConflict(error)) return 'exists';
    throw error;
  }
}

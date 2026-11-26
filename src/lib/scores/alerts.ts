import { formatDenver } from './format';
import { isSportKey } from './paths';
import { matchupPhrase } from './seo';
import type { ScoreGame, SportKey } from './types';

/** Pregame note goes out once the start is inside this window. */
export const GAME_DAY_LEAD_MS = 4 * 60 * 60 * 1000;

/**
 * Finals stay eligible this long after start so a later cron still sends,
 * without mailing the rest of the season.
 */
export const FINAL_WINDOW_MS = 18 * 60 * 60 * 1000;

export type AlertKind = 'gameday' | 'final';

export type DueAlert = {
  sport: SportKey;
  eventId: string;
  kind: AlertKind;
};

export type SentMarker = {
  eventId: string;
  kind: string;
  recipientId: string;
};

export function sentKey(eventId: string, kind: string, recipientId: string): string {
  return `${eventId}\n${kind}\n${recipientId}`;
}

export function selectDueAlerts(
  games: ReadonlyArray<{ sport: SportKey; game: Pick<ScoreGame, 'id' | 'start' | 'state'> }>,
  now: number,
): DueAlert[] {
  const due: DueAlert[] = [];
  for (const item of games) {
    const eventId = item.game.id.trim();
    const start = Date.parse(item.game.start);
    if (!eventId || !Number.isFinite(start)) continue;
    const untilStart = start - now;
    if (item.game.state === 'pre' && untilStart > 0 && untilStart <= GAME_DAY_LEAD_MS) {
      due.push({ sport: item.sport, eventId, kind: 'gameday' });
      continue;
    }
    const sinceStart = now - start;
    if (item.game.state === 'post' && sinceStart >= 0 && sinceStart <= FINAL_WINDOW_MS) {
      due.push({ sport: item.sport, eventId, kind: 'final' });
    }
  }
  return due;
}

/** Sports the person opted into, minus alerts already marked sent for them. */
export function alertsForRecipient(
  due: readonly DueAlert[],
  sports: readonly string[],
  recipientId: string,
  sent: readonly SentMarker[],
): DueAlert[] {
  const allowed = new Set(sports);
  const already = new Set(sent.map((row) => sentKey(row.eventId, row.kind, row.recipientId)));
  return due.filter((alert) => {
    if (!allowed.has(alert.sport)) return false;
    return !already.has(sentKey(alert.eventId, alert.kind, recipientId));
  });
}

export function parseSportSelection(value: unknown): SportKey[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<SportKey>();
  for (const item of value) {
    if (typeof item === 'string' && isSportKey(item)) seen.add(item);
  }
  return [...seen];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function alertCopy(opts: {
  kind: AlertKind;
  sportLabel: string;
  game: ScoreGame;
  pageUrl: string;
  unsubscribeUrl?: string;
}): { subject: string; title: string; message: string; html: string } {
  const matchup = matchupPhrase(opts.game);
  const when = formatDenver(opts.game.start);
  const tv = opts.game.tv?.trim() || 'TV not listed';
  const score = opts.game.byuScore && opts.game.opponentScore
    ? `BYU ${opts.game.byuScore}, ${opts.game.opponent} ${opts.game.opponentScore}`
    : matchup;
  const subject = opts.kind === 'gameday' ? `${opts.sportLabel}: ${matchup}` : `Final: ${score}`;
  const message = opts.kind === 'gameday' ? `${when.date} ${when.time}. ${tv}.` : score;
  const detail = opts.kind === 'gameday'
    ? `<p style="font-size:16px;line-height:1.5;">${escapeHtml(when.date)} at ${escapeHtml(when.time)}. TV: ${escapeHtml(tv)}.</p>`
    : `<p style="font-size:16px;line-height:1.5;">${escapeHtml(score)}.</p>`;
  const unsub = opts.unsubscribeUrl
    ? `<p style="font-size:12px;line-height:1.5;"><a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#1B2253;">Unsubscribe</a> from game-day alerts.</p>`
    : '';
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:24px;color:#1A1A1A;font-family:Georgia,serif;">
<h1 style="font-size:22px;line-height:1.3;color:#1B2253;">${escapeHtml(matchup)}</h1>
${detail}
<p style="font-size:16px;line-height:1.5;"><a href="${escapeHtml(opts.pageUrl)}" style="color:#1B2253;">Score and details</a></p>
<p style="font-size:13px;line-height:1.5;color:#444444;">The Cougar Chronicle is an independent student newspaper. It is not affiliated with Brigham Young University.</p>
${unsub}
</body></html>`;
  return { subject, title: subject, message, html };
}

/**
 * Article view dedupe.
 *
 * The public article HTML stays free of cookies()/auth() so it can keep its
 * current cache behavior. A tiny POST beacon asks /api/views to count, and
 * this module decides whether that request is a new reader.
 *
 * One first-party cookie, `cc_views`, remembers which post ids this browser
 * already counted. Each entry expires on its own 24h clock. The cookie value
 * only uses RFC 6265 cookie-octets (`id.expiry` pairs joined by `~`).
 */

export const ARTICLE_VIEW_COOKIE = 'cc_views';
/** How long one browser is counted at most once for a given article. */
export const ARTICLE_VIEW_WINDOW_SEC = 86400;
/** Stay well under the 4KB cookie limit (cuid + expiry is ~36 bytes). */
export const ARTICLE_VIEW_MAX_ENTRIES = 40;

const POST_ID_RE = /^c[a-z0-9]{16,32}$/;

export type ViewSkipReason =
  | 'invalid'
  | 'prefetch'
  | 'bot'
  | 'staff'
  | 'repeat'
  | 'cross-site';

export type ViewDecision =
  | { count: false; reason: ViewSkipReason }
  | { count: true; reason: 'new'; cookieValue: string };

type ViewEntry = { id: string; exp: number };

export function isValidPostId(id: string): boolean {
  return POST_ID_RE.test(id);
}

export function isPrefetchRequest(headerGet: (name: string) => string | null): boolean {
  const prefetch = headerGet('next-router-prefetch');
  if (prefetch === '1' || prefetch === '2') return true;
  if (headerGet('x-middleware-prefetch') === '1') return true;
  const purpose = `${headerGet('purpose') || ''} ${headerGet('sec-purpose') || ''}`.toLowerCase();
  return purpose.includes('prefetch');
}

/**
 * Link-unfurlers and headless audit tools that execute JS (so a beacon would
 * otherwise count them). Real browser UAs are left alone.
 */
const BOT_UA_RE =
  /bot\b|crawl|spider|slurp|headless|lighthouse|pagespeed|pingdom|wget|curl\/|facebookexternalhit|embedly|quora link preview|pinterestbot|telegrambot|slackbot|discordbot|applebot|petalbot|bytespider|gptbot|claudebot|amazonbot|semrush|ahrefs|mj12bot|dotbot|bingpreview|google-inspectiontool|feedfetcher|mediapartners|python-requests|go-http-client|scrapy|ptst\//i;

export function isObviousBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  const ua = userAgent.trim();
  if (!ua) return true;
  return BOT_UA_RE.test(ua);
}

/** Logged-in editors and admins are reading for work, not as the audience. */
export function isStaffRole(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'EDITOR';
}

/** Reject browsers posting the beacon from another site. */
export function isCrossSiteRequest(
  headerGet: (name: string) => string | null,
  requestHost: string | null
): boolean {
  const site = (headerGet('sec-fetch-site') || '').toLowerCase();
  if (site === 'cross-site') return true;
  const origin = headerGet('origin');
  if (!origin || !requestHost) return false;
  try {
    return new URL(origin).host !== requestHost;
  } catch {
    return true;
  }
}

export function parseViewCookie(raw: string | null | undefined, nowSec: number): ViewEntry[] {
  if (!raw) return [];
  const out: ViewEntry[] = [];
  const seen = new Set<string>();
  for (const part of raw.split('~')) {
    const dot = part.lastIndexOf('.');
    if (dot <= 0) continue;
    const id = part.slice(0, dot);
    const exp = Number(part.slice(dot + 1));
    if (!isValidPostId(id) || !Number.isFinite(exp) || exp <= nowSec) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, exp });
  }
  return out;
}

export function serializeViewCookie(entries: ViewEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.exp - b.exp);
  const capped = sorted.slice(-ARTICLE_VIEW_MAX_ENTRIES);
  return capped.map((entry) => `${entry.id}.${entry.exp}`).join('~');
}

export function decideArticleView(opts: {
  postId: string;
  cookie: string | null | undefined;
  userAgent: string | null | undefined;
  prefetch: boolean;
  crossSite: boolean;
  role: string | null | undefined;
  nowSec?: number;
}): ViewDecision {
  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (!isValidPostId(opts.postId)) return { count: false, reason: 'invalid' };
  if (opts.prefetch) return { count: false, reason: 'prefetch' };
  if (opts.crossSite) return { count: false, reason: 'cross-site' };
  if (isObviousBot(opts.userAgent)) return { count: false, reason: 'bot' };
  if (isStaffRole(opts.role)) return { count: false, reason: 'staff' };

  const entries = parseViewCookie(opts.cookie, nowSec);
  if (entries.some((entry) => entry.id === opts.postId)) {
    return { count: false, reason: 'repeat' };
  }

  entries.push({ id: opts.postId, exp: nowSec + ARTICLE_VIEW_WINDOW_SEC });
  return { count: true, reason: 'new', cookieValue: serializeViewCookie(entries) };
}

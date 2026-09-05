/**
 * Donation campaign + source conventions.
 * Stored on Donation rows and passed through Stripe Checkout metadata.
 */

export const DONATION_CAMPAIGN = {
  GENERAL: 'general',
  AUGUST_FUNDRAISER: 'august_fundraiser',
} as const;

/** SiteSetting key for the public fundraiser thermometer. */
export const FUNDRAISER_GOAL_KEY = 'fundraiserGoal';

/** Fallback if no goal has been saved yet. */
export const DEFAULT_FUNDRAISER_GOAL = 15_000;

/** Parse a goal from the settings form or stored string ("15000", "$15,000", "15k"). */
export function parseGoalDollars(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.round(raw);
    return n >= 1 ? n : null;
  }
  if (typeof raw !== 'string') return null;
  let cleaned = raw.trim().replace(/[$,\s_]/g, '');
  if (!cleaned) return null;
  const thousands = /k$/i.test(cleaned);
  if (thousands) cleaned = cleaned.slice(0, -1);
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = thousands ? Math.round(Number(cleaned) * 1000) : Math.round(Number(cleaned));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export function formatGoalDollars(goal: number): string {
  return `$${goal.toLocaleString('en-US')}`;
}

export type DonationCampaign =
  (typeof DONATION_CAMPAIGN)[keyof typeof DONATION_CAMPAIGN];

export const DONATION_SOURCE = {
  DONATE_PAGE: 'donate_page',
  FUNDRAISER_PAGE: 'fundraiser_page',
  ARTICLE_END: 'article_end',
  ARTICLE_MID: 'article_mid',
  MANUAL: 'manual',
  LEGACY: 'legacy',
  UNKNOWN: 'unknown',
} as const;

export type DonationSource = (typeof DONATION_SOURCE)[keyof typeof DONATION_SOURCE];

/** ~700 words ≈ longer reported pieces; mid-article CTA only above this. */
export const LONG_ARTICLE_WORD_THRESHOLD = 700;

export function campaignLabel(campaign: string | null | undefined): string {
  switch (campaign) {
    case DONATION_CAMPAIGN.AUGUST_FUNDRAISER:
      return 'Fall fundraiser';
    case DONATION_CAMPAIGN.GENERAL:
      return 'General';
    case null:
    case undefined:
    case '':
      return '—';
    default:
      return campaign;
  }
}

export function sourceLabel(source: string | null | undefined): string {
  switch (source) {
    case DONATION_SOURCE.DONATE_PAGE:
      return 'Donate page';
    case DONATION_SOURCE.FUNDRAISER_PAGE:
      return 'Fundraiser page';
    case DONATION_SOURCE.ARTICLE_END:
      return 'Article (end)';
    case DONATION_SOURCE.ARTICLE_MID:
      return 'Article (mid)';
    case DONATION_SOURCE.MANUAL:
      return 'Manual / offline';
    case DONATION_SOURCE.LEGACY:
      return 'Legacy';
    case DONATION_SOURCE.UNKNOWN:
      return 'Unknown';
    case null:
    case undefined:
    case '':
      return '—';
    default:
      return source;
  }
}

/** Plain-text word count from HTML (rough). */
export function htmlWordCount(html: string): number {
  if (!html) return 0;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

/**
 * Split HTML near the midpoint at a paragraph close (`</p>`).
 * Returns null if no good break is found.
 */
export function splitHtmlNearMidpoint(html: string): { before: string; after: string } | null {
  if (!html || html.length < 400) return null;

  const closes: number[] = [];
  const re = /<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    closes.push(m.index + m[0].length);
  }
  if (closes.length < 2) return null;

  const target = html.length / 2;
  let best = closes[0];
  let bestDist = Math.abs(best - target);
  for (const pos of closes) {
    const d = Math.abs(pos - target);
    if (d < bestDist) {
      best = pos;
      bestDist = d;
    }
  }

  // Avoid tiny first/last chunks
  if (best < html.length * 0.25 || best > html.length * 0.75) {
    // still ok if we have enough paragraphs; prefer middle third
    const midCloses = closes.filter(
      (p) => p >= html.length * 0.3 && p <= html.length * 0.7
    );
    if (midCloses.length === 0) return null;
    best = midCloses[Math.floor(midCloses.length / 2)];
  }

  const before = html.slice(0, best).trim();
  const after = html.slice(best).trim();
  if (!before || !after) return null;
  return { before, after };
}

export function shouldInsertMidArticleDonate(html: string): boolean {
  return htmlWordCount(html) >= LONG_ARTICLE_WORD_THRESHOLD;
}

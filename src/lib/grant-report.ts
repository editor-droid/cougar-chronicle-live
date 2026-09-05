import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';

function siteOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://thecougarchronicle.com';
  return raw.replace(/\/$/, '');
}

const TZ = 'America/Denver';
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export type GrantArticleRow = {
  index: number;
  title: string;
  url: string;
  slug: string;
  publishedDateMt: string;
  publishedAtMt: string;
  publishedAtUtc: string;
  author: string;
  category: string;
  format: string;
  premium: 'yes' | 'no';
  printEdition: 'yes' | 'no';
  america250: 'yes' | 'no';
  lifetimeArticleViews: number;
};

export function parseYmd(raw: unknown): string | null {
  if (typeof raw !== 'string' || !YMD.test(raw.trim())) return null;
  const value = raw.trim();
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return value;
}

function partsInZone(ms: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Midnight America/Denver on this calendar date. */
export function denverDayStart(ymd: string): Date {
  const [Y, M, D] = ymd.split('-').map(Number);
  const desired = Date.UTC(Y, M - 1, D, 0, 0, 0);
  let utc = desired;
  for (let i = 0; i < 3; i++) {
    const p = partsInZone(utc);
    const got = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    utc -= got - desired;
  }
  return new Date(utc);
}

export function denverDayEndExclusive(ymd: string): Date {
  const [Y, M, D] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(Y, M - 1, D + 1));
  return denverDayStart(next.toISOString().slice(0, 10));
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function mtDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

function mtStamp(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleString('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function authorName(post: { customAuthor: string | null; author: { name: string | null } | null }): string {
  const custom = (post.customAuthor || '').trim();
  if (custom) return custom;
  return (post.author?.name || '').trim() || '—';
}

export async function listPublishedArticles(fromYmd: string, toYmd: string): Promise<GrantArticleRow[]> {
  const start = denverDayStart(fromYmd);
  const end = denverDayEndExclusive(toYmd);
  const origin = siteOrigin();

  const posts = await prisma.post.findMany({
    where: {
      state: 'PUBLISHED',
      publishedAt: { gte: start, lt: end },
    },
    orderBy: { publishedAt: 'asc' },
    include: { author: { select: { name: true } } },
  });

  return posts.map((p, i) => ({
    index: i + 1,
    title: p.title,
    url: `${origin}${getArticleUrl(p)}`,
    slug: p.slug,
    publishedDateMt: mtDate(p.publishedAt),
    publishedAtMt: mtStamp(p.publishedAt),
    publishedAtUtc: p.publishedAt ? p.publishedAt.toISOString() : '',
    author: authorName(p),
    category: p.category,
    format: p.format,
    premium: p.isPremium ? 'yes' : 'no',
    printEdition: p.printEditionId ? 'yes' : 'no',
    america250: p.isAmerica250 ? 'yes' : 'no',
    lifetimeArticleViews: p.views,
  }));
}

export function articlesToCsv(rows: GrantArticleRow[]): string {
  return toCsv(
    [
      '#',
      'title',
      'url',
      'slug',
      'published_date_mt',
      'published_at_mt',
      'published_at_utc',
      'author',
      'category',
      'format',
      'premium',
      'print_edition',
      'america_250',
      'lifetime_article_views',
    ],
    rows.map((r) => ({
      '#': r.index,
      title: r.title,
      url: r.url,
      slug: r.slug,
      published_date_mt: r.publishedDateMt,
      published_at_mt: r.publishedAtMt,
      published_at_utc: r.publishedAtUtc,
      author: r.author,
      category: r.category,
      format: r.format,
      premium: r.premium,
      print_edition: r.printEdition,
      america_250: r.america250,
      lifetime_article_views: r.lifetimeArticleViews,
    }))
  );
}

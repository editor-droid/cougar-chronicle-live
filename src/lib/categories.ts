/**
 * Public news sections — gold-standard URL structure.
 *
 * Canonical paths are top-level (like major newsrooms):
 *   /news  /opinion  /campus  /politics  /family  /faith
 *
 * Nav order (public): News · Opinion · Campus · Politics · Family · Faith · Print
 *
 * Legacy /category/{slug} permanently redirects to these.
 * Article permalinks are flat /{story-slug} (stable if section changes).
 *
 * Pending approval with the broader taxonomy / public-nav package.
 */

export const PUBLIC_SECTIONS = [
  {
    slug: 'news',
    label: 'News',
    navLabel: 'News',
    title: 'News',
    description:
      'Independent reporting for Brigham Young University and Provo — stories you will not get from the official channels.',
    keywords: [
      'BYU news',
      'Independent BYU news',
      'Conservative student journalism',
      'Brigham Young University events',
      'Utah university news',
      'Provo news',
    ],
  },
  {
    slug: 'opinion',
    label: 'Opinion',
    navLabel: 'Opinion',
    title: 'Opinion',
    description:
      'Student and staff opinion on public life, culture, and the issues that matter — independent voices at BYU.',
    keywords: [
      'BYU conservative opinion',
      'LDS student perspectives',
      'Traditional values on campus',
      'Brigham Young University student voices',
      'Faith-based political commentary',
    ],
  },
  {
    slug: 'campus',
    label: 'Campus',
    navLabel: 'Campus',
    title: 'Campus',
    description:
      'BYU campus life, student culture, and campus opinion — news and commentary rooted in Provo and the Y.',
    keywords: [
      'BYU campus news',
      'BYU campus life',
      'BYU student culture',
      'Campus opinion BYU',
      'Brigham Young University campus',
      'Provo campus news',
      'ROC pass',
      'Cougareat',
      'honor code',
    ],
  },
  {
    slug: 'politics',
    label: 'Politics',
    navLabel: 'Politics',
    title: 'Politics',
    description:
      'Utah, national, and student-relevant politics with a conservative lens for Brigham Young University readers.',
    keywords: [
      'BYU politics',
      'Utah politics',
      'Conservative politics BYU',
      'Provo politics',
      'Student political news',
    ],
  },
  {
    slug: 'family',
    label: 'Family Issues',
    navLabel: 'Family',
    title: 'Family Issues',
    description:
      'Coverage of marriage, family, and culture from a values-first perspective for the BYU community.',
    keywords: [
      'Family issues BYU',
      'LDS family',
      'Family Proclamation',
      'BYU family news',
      'Marriage and family Utah',
    ],
  },
  {
    slug: 'faith',
    label: 'Faith',
    navLabel: 'Faith',
    title: 'Faith',
    description:
      'Gospel-centered reporting and analysis for Latter-day Saint students at BYU — defending faith with clarity and courage.',
    keywords: [
      'BYU faith articles',
      'Latter-day Saint student news',
      'LDS perspectives',
      'Defending the faith on campus',
      'Brigham Young University religious news',
      'Gospel-centered news',
    ],
  },
] as const;

export type PublicSectionSlug = (typeof PUBLIC_SECTIONS)[number]['slug'];

export const SECTION_SLUGS: readonly PublicSectionSlug[] = PUBLIC_SECTIONS.map((s) => s.slug);

/**
 * Public header/footer order (Print is separate — product path /print-edition).
 * Matches: News · Opinion · Campus · Politics · Family · Faith · Print
 */
export const NAV_SECTION_ORDER: readonly PublicSectionSlug[] = [
  'news',
  'opinion',
  'campus',
  'politics',
  'family',
  'faith',
] as const;

/**
 * Dual taxonomy:
 * - category = topic hub (campus, politics, family, faith, news, …)
 * - format   = content type for aggregates: news | opinion
 *
 * /faith → category=faith (all formats)
 * /opinion → format=opinion (all topics)
 * /news → format=news (all topics)
 */

/** Content-type formats (aggregates on News + Opinion hubs). */
export const POST_FORMATS = ['news', 'opinion'] as const;
export type PostFormat = (typeof POST_FORMATS)[number];

/**
 * Topic categories only (NOT News / Opinion — those are format aggregates).
 * Every article must have one of these + a format (news | opinion).
 */
export const TOPIC_CATEGORY_SLUGS = [
  'campus',
  'politics',
  'family',
  'faith',
] as const;
export type TopicCategorySlug = (typeof TOPIC_CATEGORY_SLUGS)[number];

/** Editor category options (topic hubs only). */
export const EDITOR_CATEGORIES = [
  { value: 'campus', label: 'Campus' },
  { value: 'politics', label: 'Politics' },
  { value: 'family', label: 'Family Issues' },
  { value: 'faith', label: 'Faith' },
] as const;

export const EDITOR_FORMATS = [
  { value: 'news', label: 'News' },
  { value: 'opinion', label: 'Opinion / Op-Ed' },
] as const;

export function isSectionSlug(value: string): value is PublicSectionSlug {
  return (SECTION_SLUGS as readonly string[]).includes(value);
}

export function isPostFormat(value: string): value is PostFormat {
  return (POST_FORMATS as readonly string[]).includes(value);
}

export function getSection(slug: string) {
  return PUBLIC_SECTIONS.find((s) => s.slug === slug) ?? null;
}

export function categoryLabel(slug: string): string {
  const found = getSection(slug);
  if (found) return found.label;
  if (!slug) return 'News';
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

export function formatLabel(format: string): string {
  if (format === 'opinion') return 'Opinion';
  return 'News';
}

/** Canonical public path for a section — NEVER /category/… */
export function getSectionPath(slug: string): string {
  const s = String(slug || '').toLowerCase().trim();
  if (s === 'family-issues') return '/family';
  if (isSectionSlug(s)) return `/${s}`;
  return `/news`;
}

export function getSectionAbsoluteUrl(slug: string): string {
  const base = (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://thecougarchronicle.com'
  ).replace(/\/$/, '');
  return `${base}${getSectionPath(slug)}`;
}

/**
 * Prisma `where` for a public hub listing.
 * News + Opinion hubs aggregate by format; topic hubs filter by category.
 */
export function postsWhereForPublicHub(slug: PublicSectionSlug): {
  category?: string;
  format?: string;
} {
  if (slug === 'news') return { format: 'news' };
  if (slug === 'opinion') return { format: 'opinion' };
  return { category: slug };
}

/**
 * Article permalinks are always story-slug based.
 * Changing post.category only changes which section listing includes it.
 */
export function articleUrlsStableAcrossCategoryMigration(): true {
  return true;
}

/** Normalize CSV / free-text tokens to category or format slugs. */
export function normalizeTopicSlug(raw: string): string {
  const s = raw.toLowerCase().trim().replace(/\s+/g, ' ');
  if (!s) return 'news';
  if (s === 'family issues' || s === 'family-issues') return 'family';
  if (s === 'campus news') return 'campus';
  if (s === 'op-ed' || s === 'oped' || s === 'opinon') return 'opinion';
  return s.replace(/\s+/g, '-');
}

export function normalizeFormatSlug(raw: string): PostFormat {
  const s = raw.toLowerCase().trim();
  if (
    s === 'opinion' ||
    s === 'op-ed' ||
    s === 'oped' ||
    s === 'opinon' ||
    s.includes('opinion') ||
    s.includes('op-ed')
  ) {
    return 'opinion';
  }
  return 'news';
}

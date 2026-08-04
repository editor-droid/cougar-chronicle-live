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

/** Editor category options (value = DB field = section slug). Same order as nav. */
export const EDITOR_CATEGORIES = NAV_SECTION_ORDER.map((slug) => {
  const s = PUBLIC_SECTIONS.find((x) => x.slug === slug)!;
  return { value: s.slug, label: s.label };
}) as ReadonlyArray<{ value: PublicSectionSlug; label: string }>;

export function isSectionSlug(value: string): value is PublicSectionSlug {
  return (SECTION_SLUGS as readonly string[]).includes(value);
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
 * Article permalinks are always story-slug based.
 * Changing post.category only changes which section listing includes it.
 */
export function articleUrlsStableAcrossCategoryMigration(): true {
  return true;
}

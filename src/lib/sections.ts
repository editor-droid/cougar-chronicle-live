/**
 * Content desks (sections) + format tags (News reportage vs Opinion/op-ed).
 * category column = section slug; format column = 'news' | 'opinion'.
 */

export const SECTION_SLUGS = [
  'news',
  'politics',
  'faith',
  'family',
  'print-edition',
] as const;

export type SectionSlug = (typeof SECTION_SLUGS)[number];

export const FORMAT_SLUGS = ['news', 'opinion'] as const;
export type FormatSlug = (typeof FORMAT_SLUGS)[number];

export type SectionDef = {
  slug: SectionSlug;
  label: string;
  description: string;
  /** SEO keywords for category index */
  keywords: string[];
};

export const SECTIONS: SectionDef[] = [
  {
    slug: 'news',
    label: 'News',
    description: 'Campus and community reporting from The Cougar Chronicle.',
    keywords: [
      'BYU campus news',
      'Independent BYU news',
      'Conservative student journalism',
      'Brigham Young University events',
      'Utah university news',
    ],
  },
  {
    slug: 'politics',
    label: 'Politics',
    description: 'National and local politics, public affairs, and civic life.',
    keywords: [
      'BYU politics',
      'Utah politics',
      'conservative politics',
      'student political journalism',
      'LDS politics news',
    ],
  },
  {
    slug: 'faith',
    label: 'Faith',
    description: 'Faith, religion, and Latter-day Saint life on campus and beyond.',
    keywords: [
      'BYU faith articles',
      'Latter-day Saint student news',
      'LDS perspectives',
      'Gospel-centered news',
    ],
  },
  {
    slug: 'family',
    label: 'Family',
    description: 'Family, marriage, culture, and the rising generation.',
    keywords: [
      'family values',
      'LDS family',
      'marriage and parenting',
      'BYU culture',
    ],
  },
  {
    slug: 'print-edition',
    label: 'Print Edition',
    description: 'Stories from and for The Cougar Chronicle print volume.',
    keywords: [
      'Cougar Chronicle print edition',
      'BYU print magazine',
      'student print journalism',
    ],
  },
];

export const FORMAT_LABELS: Record<FormatSlug, string> = {
  news: 'News',
  opinion: 'Opinion',
};

/** Main nav order when taxonomy v2 is live (feature branch / go-live). */
export const MAIN_NAV = [
  { href: '/category/news', label: 'News' },
  { href: '/category/politics', label: 'Politics' },
  { href: '/category/faith', label: 'Faith' },
  { href: '/category/family', label: 'Family' },
  { href: '/america-250', label: 'America 250', emphasize: true },
  { href: '/print-edition', label: 'Print Edition' },
  { href: '/videos', label: 'Videos' },
] as const;

/** Footer / secondary: all op-eds (format=opinion), not a desk */
export const OPINION_ARCHIVE = { href: '/opinion', label: 'Opinion' } as const;

export function isSectionSlug(s: string): s is SectionSlug {
  return (SECTION_SLUGS as readonly string[]).includes(s);
}

export function isFormatSlug(s: string): s is FormatSlug {
  return (FORMAT_SLUGS as readonly string[]).includes(s);
}

export function getSection(slug: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.slug === slug);
}

export function getSectionLabel(slug: string): string {
  return getSection(slug)?.label || slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Normalize legacy category strings. */
export function normalizeLegacyCategory(raw: string | null | undefined): string {
  return (raw || 'news').trim().toLowerCase();
}

/**
 * Default section+format when migrating a legacy category (keyword plan may override).
 */
export function legacyCategoryDefaults(raw: string): {
  section: SectionSlug;
  format: FormatSlug;
} {
  const c = normalizeLegacyCategory(raw);
  if (c === 'opinion') return { section: 'politics', format: 'opinion' };
  if (c === 'faith') return { section: 'faith', format: 'news' };
  if (c === 'print-edition' || c === 'print') return { section: 'print-edition', format: 'news' };
  if (c === 'politics') return { section: 'politics', format: 'news' };
  if (c === 'family') return { section: 'family', format: 'news' };
  return { section: 'news', format: 'news' };
}

/**
 * Email / push preference mapping.
 * Opinion format → opinion list; faith section → faith; everything else → news list.
 */
export function preferenceBucket(section: string, format: string): 'news' | 'faith' | 'opinion' {
  if (format === 'opinion') return 'opinion';
  if (section === 'faith') return 'faith';
  return 'news';
}

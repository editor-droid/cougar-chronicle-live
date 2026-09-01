/**
 * Production-grade URL slug helpers for Chronicle articles.
 * Used by savePost, AI slug API, editor, videos, and TOC — one ruleset everywhere.
 */

/** Max length for path segment (Google ~60 display; 72 keeps room for uniqueness suffix). */
export const SLUG_MAX_LEN = 72;

/** Leave room for `-n` uniqueness suffix in ensureUniqueSlug. */
export const SLUG_BASE_MAX_LEN = 68;

/**
 * Path segments that must never become article/video slugs
 * (would collide with App Router routes or confuse crawlers).
 */
export const RESERVED_SLUGS = new Set([
  'api',
  'dashboard',
  'login',
  'logout',
  'account',
  'about',
  'contact',
  'search',
  'category',
  // Public section hubs (must never be article slugs)
  'news',
  'opinion',
  'campus',
  'faith',
  'family',
  'family-issues',
  'politics',
  'print',
  'print-edition',
  'article',
  'articles',
  'premium-article',
  'videos',
  'video',
  'author',
  'authors',
  'admin',
  'membership',
  'fundraiser',
  'donate',
  'recruiting',
  'apply',
  'links',
  'corrections',
  'america-250',
  'byu-news',
  'byu-roc-pass',
  'byu-cougareat',
  'byu-honor-code',
  'new',
  'edit',
  'null',
  'undefined',
  'index',
  'home',
  'page',
  'blog',
  'post',
  'posts',
  'feed',
  'rss',
  'sitemap',
  'robots',
  'favicon',
  'manifest',
  'cougar-chronicle',
  'the-cougar-chronicle',
  'chronicle',
]);

/** Common English stop words to drop from auto-slugs (not from manually typed slugs). */
const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'be',
  'been',
  'being',
  'that',
  'this',
  'these',
  'those',
  'it',
  'its',
  'into',
  'over',
  'after',
  'before',
  'about',
  'than',
  'then',
  'so',
  'if',
  'when',
  'while',
  'how',
  'what',
  'which',
  'who',
  'whom',
  'why',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'can',
  'just',
  'also',
  'very',
  'really',
  'more',
  'most',
  'some',
  'any',
  'all',
  'each',
  'every',
  'both',
  'few',
  'many',
  'much',
  'own',
  'same',
  'other',
  'such',
  'only',
  'too',
  'up',
  'out',
  'off',
  'down',
  'under',
  'again',
  'further',
  'once',
  'here',
  'there',
  'where',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'doing',
  'am',
  'i',
  'me',
  'my',
  'we',
  'our',
  'you',
  'your',
  'he',
  'she',
  'they',
  'them',
  'his',
  'her',
  'their',
]);

/**
 * Normalize any string into a clean URL slug.
 * - Lowercase ASCII
 * - Strip accents
 * - Hyphen-separated words only
 * - No consecutive/leading/trailing hyphens
 * - Optional stop-word removal for tighter SEO paths (auto from title only)
 */
export function slugifyTitle(
  input: string,
  opts?: { dropStopWords?: boolean; maxLen?: number }
): string {
  const maxLen = opts?.maxLen ?? SLUG_MAX_LEN;
  let s = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // smart quotes / dashes
    .replace(/['''`]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (opts?.dropStopWords !== false) {
    const origParts = s.split('-').filter(Boolean);
    const parts = origParts.filter((w) => !STOP.has(w));
    // Keep at least 2 tokens if we can; if stripping emptied it, fall back
    if (parts.length >= 2) {
      s = parts.join('-');
    } else if (parts.length === 1 && origParts.length > 1) {
      // Prefer keeping more signal from original if only one non-stop remains
      s = parts.join('-') || origParts.join('-');
    } else if (parts.length === 0) {
      s = origParts.join('-');
    } else {
      s = parts.join('-');
    }
  }

  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');

  if (s.length > maxLen) {
    s = s.slice(0, maxLen).replace(/-+$/g, '');
    // Prefer cutting on a word boundary when long
    if (s.includes('-')) {
      const cut = s.lastIndexOf('-');
      if (cut >= Math.floor(maxLen * 0.55)) s = s.slice(0, cut);
    }
  }

  // Never emit a reserved path as the final slug
  if (!s || RESERVED_SLUGS.has(s)) {
    return s && RESERVED_SLUGS.has(s) ? `${s}-story` : 'article';
  }

  return s;
}

/** Strict sanitize for user-typed slugs (keeps structure, forces valid chars, no stop-word drop). */
export function sanitizeSlugInput(raw: string): string {
  return slugifyTitle(raw, { dropStopWords: false, maxLen: SLUG_MAX_LEN });
}

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > SLUG_MAX_LEN) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export type SlugQuality = {
  ok: boolean;
  warnings: string[];
  length: number;
  wordCount: number;
};

export function assessSlug(slug: string): // quality hints for the editor — non-blocking except empty/invalid
SlugQuality {
  const warnings: string[] = [];
  const s = slug || '';
  const parts = s ? s.split('-').filter(Boolean) : [];

  if (!s) warnings.push('Slug is empty');
  if (s && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) {
    warnings.push('Use only lowercase letters, numbers, and single hyphens');
  }
  if (RESERVED_SLUGS.has(s)) {
    warnings.push('Reserved path — pick a different slug');
  }
  if (s.length > 60) warnings.push('Over 60 characters — may truncate in Google');
  if (s.length > 0 && s.length < 8) warnings.push('Very short — prefer a more descriptive path');
  if (parts.length > 0 && parts.length < 3) {
    warnings.push('Prefer 3–8 words for a distinctive, searchable path');
  }
  if (parts.length > 8) warnings.push('Too many words — tighten to the core entities');
  if (/(^|-)(the|and|of|a|an|to|in|for|with|on|is|was|as)(-|$)/.test(s)) {
    warnings.push('Contains filler words — consider tightening');
  }
  if (/--/.test(s)) warnings.push('Double hyphens are invalid');
  if (/(cougar-chronicle|the-chronicle|blog|article|post)$/i.test(s)) {
    warnings.push('Avoid site name or generic endings (article, blog, post)');
  }
  if (/^\d{4}(-|$)/.test(s) || /(-)\d{4}$/.test(s)) {
    warnings.push('Years in URLs age poorly unless essential to the story');
  }

  const formatOk = !s || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
  return {
    ok: warnings.length === 0 && formatOk && isValidSlug(s),
    warnings,
    length: s.length,
    wordCount: parts.length,
  };
}

/**
 * Ensure a slug is unique among posts (or any async existence check).
 * Does NOT re-drop stop words — callers pass already-finalized seeds.
 */
export function withUniquenessSuffix(base: string, attempt: number): string {
  const clean = sanitizeSlugInput(base) || 'article';
  if (attempt <= 0) {
    return clean.length > SLUG_BASE_MAX_LEN
      ? clean.slice(0, SLUG_BASE_MAX_LEN).replace(/-+$/g, '') || 'article'
      : clean;
  }
  const suffix = `-${attempt}`;
  const room = SLUG_MAX_LEN - suffix.length;
  const truncated = clean.slice(0, Math.min(SLUG_BASE_MAX_LEN, room)).replace(/-+$/g, '') || 'article';
  return `${truncated}${suffix}`;
}

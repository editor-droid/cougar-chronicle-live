import prisma from '@/lib/prisma';

/** Historical WordPress / brand tails accidentally baked into post slugs. */
export const BRAND_SLUG_SUFFIXES = [
  '-the-coug-chron',
  '-the-cougar-chronicle',
] as const;

/** Drop a trailing brand suffix if present. Does not rewrite the database. */
export function stripBrandSlugSuffix(slug: string): string {
  const s = String(slug || '');
  for (const suffix of BRAND_SLUG_SUFFIXES) {
    if (s.endsWith(suffix) && s.length > suffix.length) {
      return s.slice(0, -suffix.length);
    }
  }
  return s;
}

/**
 * Lookup keys for a request slug: the original, the stripped form,
 * and original + each known brand suffix.
 */
export function brandSuffixVariants(slug: string): string[] {
  const original = String(slug || '');
  if (!original) return [];
  const stripped = stripBrandSlugSuffix(original);
  const variants = new Set<string>();
  variants.add(original);
  if (stripped) variants.add(stripped);
  for (const suffix of BRAND_SLUG_SUFFIXES) {
    variants.add(`${original}${suffix}`);
  }
  return [...variants];
}

/** Published post at this slug, or a brand-suffix alias of it. */
export async function findPublishedPostBySlug(slug: string) {
  const exact = await prisma.post.findUnique({
    where: { slug },
    include: { author: true },
  });
  if (exact?.state === 'PUBLISHED') return exact;

  const variants = brandSuffixVariants(slug).filter((s) => s !== slug);
  if (variants.length === 0) return null;

  return prisma.post.findFirst({
    where: {
      state: 'PUBLISHED',
      slug: { in: variants },
    },
    include: { author: true },
  });
}

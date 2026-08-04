import { permanentRedirect, notFound } from 'next/navigation';
import { getSectionPath, isSectionSlug } from '@/lib/categories';

/**
 * Legacy /category/{slug} → permanent redirect to canonical /{slug}
 * (e.g. /category/news → /news). Preserves page/sort query for pagination.
 */
export default async function LegacyCategoryRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug: raw } = await params;
  const qs = await searchParams;
  const slug = String(raw || '').toLowerCase().trim();
  const normalized = slug === 'family-issues' ? 'family' : slug;

  if (!isSectionSlug(normalized)) {
    notFound();
  }

  const path = getSectionPath(normalized);
  const paramsOut = new URLSearchParams();
  if (qs.sort === 'oldest') paramsOut.set('sort', 'oldest');
  if (qs.page && qs.page !== '1') paramsOut.set('page', qs.page);
  const q = paramsOut.toString();
  permanentRedirect(q ? `${path}?${q}` : path);
}

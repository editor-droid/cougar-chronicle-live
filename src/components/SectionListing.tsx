import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getSection, type PublicSectionSlug } from '@/lib/categories';
import { loadSectionPage } from '@/lib/section-listing';
import { buildSectionJsonLd } from '@/lib/section-seo';
import SectionListingView from '@/components/SectionListingView';

export default async function SectionListing({
  slug,
  rail,
  lead,
}: {
  slug: PublicSectionSlug;
  rail?: ReactNode;
  lead?: ReactNode;
}) {
  const section = getSection(slug);
  if (!section) notFound();

  const initial = await loadSectionPage(slug, { page: '1', sort: null });
  const jsonLd = buildSectionJsonLd(slug, initial.posts, { page: initial.page });

  return (
    <SectionListingView
      slug={slug}
      initial={initial}
      initialJsonLd={jsonLd}
      section={{ label: section.label, description: section.description }}
      rail={rail}
      lead={lead}
    />
  );
}

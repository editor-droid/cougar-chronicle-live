import type { Metadata } from 'next';
import SectionListing from '@/components/SectionListing';
import ByuScoresWidget from '@/components/ByuScoresWidget';
import { buildSectionMetadata } from '@/lib/section-seo';

export const metadata: Metadata = buildSectionMetadata('sports');

export default async function SportsSectionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  return (
    <SectionListing
      slug="sports"
      searchParams={await searchParams}
      rail={<ByuScoresWidget />}
    />
  );
}

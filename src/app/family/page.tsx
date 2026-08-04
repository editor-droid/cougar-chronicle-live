import type { Metadata } from 'next';
import SectionListing from '@/components/SectionListing';
import { buildSectionMetadata } from '@/lib/section-seo';

export const metadata: Metadata = buildSectionMetadata('family');

export default async function FamilySectionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  return <SectionListing slug="family" searchParams={await searchParams} />;
}

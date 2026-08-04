import type { Metadata } from 'next';
import SectionListing from '@/components/SectionListing';
import { buildSectionMetadata } from '@/lib/section-seo';

export const metadata: Metadata = buildSectionMetadata('faith');

export default async function FaithSectionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  return <SectionListing slug="faith" searchParams={await searchParams} />;
}

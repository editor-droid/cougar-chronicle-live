import type { Metadata } from 'next';
import SectionListing from '@/components/SectionListing';
import { buildSectionMetadata } from '@/lib/section-seo';

export const metadata: Metadata = buildSectionMetadata('campus');

export default async function CampusSectionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  return <SectionListing slug="campus" searchParams={await searchParams} />;
}

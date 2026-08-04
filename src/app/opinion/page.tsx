import type { Metadata } from 'next';
import SectionListing from '@/components/SectionListing';
import { buildSectionMetadata } from '@/lib/section-seo';

export const metadata: Metadata = buildSectionMetadata('opinion');

export default async function OpinionSectionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  return <SectionListing slug="opinion" searchParams={await searchParams} />;
}

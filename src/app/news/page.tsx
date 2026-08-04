import type { Metadata } from 'next';
import SectionListing from '@/components/SectionListing';
import { buildSectionMetadata } from '@/lib/section-seo';

export const metadata: Metadata = buildSectionMetadata('news');

export default async function NewsSectionPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  return <SectionListing slug="news" searchParams={await searchParams} />;
}

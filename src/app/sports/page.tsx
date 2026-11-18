import type { Metadata } from 'next';
import SectionListing from '@/components/SectionListing';
import { buildSectionMetadata } from '@/lib/section-seo';

export const metadata: Metadata = buildSectionMetadata('sports');

export const revalidate = 120;

export default async function SportsSectionPage() {
  return <SectionListing slug="sports" />;
}

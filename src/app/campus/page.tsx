import type { Metadata } from 'next';
import SectionListing from '@/components/SectionListing';
import { buildSectionMetadata } from '@/lib/section-seo';

export const metadata: Metadata = buildSectionMetadata('campus');

export const revalidate = 120;

export default async function CampusSectionPage() {
  return <SectionListing slug="campus" />;
}

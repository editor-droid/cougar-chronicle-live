import type { Metadata } from 'next';
import SectionListing from '@/components/SectionListing';
import ByuScoresWidget from '@/components/ByuScoresWidget';
import GameDayAlerts from '@/components/sports/GameDayAlerts';
import TeamButtons from '@/components/sports/TeamButtons';
import { buildSectionMetadata } from '@/lib/section-seo';

export const metadata: Metadata = buildSectionMetadata('sports');

export const revalidate = 120;

export default async function SportsSectionPage() {
  return (
    <SectionListing
      slug="sports"
      rail={<ByuScoresWidget />}
      lead={<TeamButtons />}
      footer={<GameDayAlerts />}
    />
  );
}

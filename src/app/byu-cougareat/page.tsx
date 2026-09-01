import type { Metadata } from 'next';
import TopicHubListing, { buildTopicHubMetadata } from '@/components/TopicHubListing';

export const revalidate = 300;

export function generateMetadata(): Metadata {
  return buildTopicHubMetadata('byu-cougareat');
}

export default async function ByuCougareatPage() {
  return <TopicHubListing slug="byu-cougareat" />;
}

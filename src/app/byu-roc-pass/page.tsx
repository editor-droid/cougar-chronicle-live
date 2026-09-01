import type { Metadata } from 'next';
import TopicHubListing, { buildTopicHubMetadata } from '@/components/TopicHubListing';

export const revalidate = 300;

export function generateMetadata(): Metadata {
  return buildTopicHubMetadata('byu-roc-pass');
}

export default async function ByuRocPassPage() {
  return <TopicHubListing slug="byu-roc-pass" />;
}

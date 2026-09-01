import type { Metadata } from 'next';
import TopicHubListing, { buildTopicHubMetadata } from '@/components/TopicHubListing';

export const revalidate = 300;

export function generateMetadata(): Metadata {
  return buildTopicHubMetadata('byu-honor-code');
}

export default async function ByuHonorCodePage() {
  return <TopicHubListing slug="byu-honor-code" />;
}

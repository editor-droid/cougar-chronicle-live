import { topicPrefForPost, type TopicPref } from './subscriber-prefs';

const TOPIC_SEGMENT: Record<TopicPref, string> = {
  wantsNews: 'CC instant news',
  wantsCampus: 'CC instant campus',
  wantsPolitics: 'CC instant politics',
  wantsFaith: 'CC instant faith',
  wantsOpinion: 'CC instant opinion',
};

/** Stable Resend segment for one post's instant list. */
export function segmentNameForPost(post: {
  category?: string | null;
  format?: string | null;
  isBreaking?: boolean | null;
  isAmerica250?: boolean | null;
}): string {
  if (post.isBreaking) return 'CC breaking';
  if (post.isAmerica250) return 'CC instant all';
  return TOPIC_SEGMENT[topicPrefForPost(post)];
}

export function segmentNameForDigest(mask: number): string {
  return `CC digest ${mask}`;
}

export const VIDEO_SEGMENT_NAME = 'CC instant videos';

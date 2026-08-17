/**
 * Who should get an email for this post.
 *
 * Account checkboxes: News, Campus, Politics, Faith, Opinion.
 * Posts use `format` (news | opinion) plus a topic `category`
 * (campus | politics | family | faith | news | …).
 *
 * Opinion format always maps to Opinion, even if the topic is campus/politics.
 * Campus / Politics only apply to news-format stories in those sections.
 * Family and leftover news-format topics stay under News.
 */

export type TopicPref =
  | 'wantsNews'
  | 'wantsCampus'
  | 'wantsPolitics'
  | 'wantsFaith'
  | 'wantsOpinion';

export type SubscriberTopicPrefs = Partial<Record<TopicPref, boolean | null>>;

export function topicPrefForPost(post: {
  category?: string | null;
  format?: string | null;
}): TopicPref {
  const cat = (post.category || '').toLowerCase();
  const fmt = (post.format || '').toLowerCase();
  if (fmt === 'opinion' || cat === 'opinion') return 'wantsOpinion';
  if (cat === 'faith') return 'wantsFaith';
  if (cat === 'campus') return 'wantsCampus';
  if (cat === 'politics') return 'wantsPolitics';
  return 'wantsNews';
}

export function subscriberMatchesPost(
  sub: SubscriberTopicPrefs,
  post: {
    category?: string | null;
    format?: string | null;
    isBreaking?: boolean | null;
    isAmerica250?: boolean | null;
  }
): boolean {
  if (post.isAmerica250 || post.isBreaking) return true;
  return !!sub[topicPrefForPost(post)];
}

export function subscriberWhereForPost(post: {
  category?: string | null;
  format?: string | null;
  isBreaking?: boolean | null;
  isAmerica250?: boolean | null;
}) {
  const where: {
    isActive: true;
    wantsInstant?: true;
    wantsNews?: true;
    wantsCampus?: true;
    wantsPolitics?: true;
    wantsFaith?: true;
    wantsOpinion?: true;
    OR?: Array<{ wantsInstant: true } | { wantsBreaking: true }>;
  } = { isActive: true };

  if (post.isBreaking) {
    where.OR = [{ wantsInstant: true }, { wantsBreaking: true }];
  } else {
    where.wantsInstant = true;
  }

  // America 250 and breaking skip topic filters — they go to the matching cadence list.
  if (post.isAmerica250 || post.isBreaking) return where;

  where[topicPrefForPost(post)] = true;
  return where;
}

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import {
  MOST_READ_FALLBACK_MS,
  MOST_READ_REVALIDATE_SECONDS,
  selectMostRead,
  utcDay,
  type MostReadWindow,
} from '@/lib/most-read';

/**
 * Next.js 16 without `cacheComponents` caches non-fetch work through
 * `unstable_cache` (see node_modules/next/dist/docs caching-without-cache-components).
 * One shared entry, about five minutes, so sidebars do not each hit the DB.
 */
const ALL_TIME_POOL = 50;

export type MostReadPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
  printEditionId: string | null;
  isPremium: boolean;
  /** Lifetime Post.views. */
  views: number;
  /** Views inside the chosen window. Equals `views` for the all-time list. */
  periodViews: number;
  publishedAt: string | null;
};

type CachedPost = Omit<MostReadPost, 'periodViews'>;

type CachedSource = {
  generatedAt: string;
  daily: { postId: string; date: string; count: number }[];
  posts: CachedPost[];
  allTimeIds: string[];
};

const postSelect = {
  id: true,
  title: true,
  slug: true,
  category: true,
  printEditionId: true,
  isPremium: true,
  views: true,
  publishedAt: true,
} as const;

function toCachedPost(post: {
  id: string;
  title: string;
  slug: string;
  category: string;
  printEditionId: string | null;
  isPremium: boolean;
  views: number;
  publishedAt: Date | null;
}): CachedPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    category: post.category,
    printEditionId: post.printEditionId,
    isPremium: post.isPremium,
    views: post.views,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
  };
}

function dateKeyFromDb(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

async function loadMostReadSource(): Promise<CachedSource> {
  const now = new Date();
  const earliest = utcDay(new Date(now.getTime() - MOST_READ_FALLBACK_MS));
  const posts = new Map<string, CachedPost>();

  const dailyQuery = prisma.postViewDaily.findMany({
    where: {
      date: { gte: earliest },
      count: { gt: 0 },
      post: { state: 'PUBLISHED' },
    },
    select: {
      postId: true,
      date: true,
      count: true,
      post: { select: postSelect },
    },
  }).catch((error: unknown) => {
    console.error('most-read daily', error);
    return [];
  });

  const [allTime, rows] = await Promise.all([
    prisma.post.findMany({
      where: { state: 'PUBLISHED' },
      orderBy: { views: 'desc' },
      take: ALL_TIME_POOL,
      select: postSelect,
    }),
    dailyQuery,
  ]);

  for (const post of allTime) posts.set(post.id, toCachedPost(post));

  const daily: CachedSource['daily'] = rows.map((row) => {
    posts.set(row.post.id, toCachedPost(row.post));
    return {
      postId: row.postId,
      date: dateKeyFromDb(row.date),
      count: row.count,
    };
  });

  return {
    generatedAt: now.toISOString(),
    daily,
    posts: [...posts.values()],
    allTimeIds: allTime.map((post) => post.id),
  };
}

const getCachedMostReadSource = unstable_cache(
  loadMostReadSource,
  ['most-read-today-v1'],
  { revalidate: MOST_READ_REVALIDATE_SECONDS }
);

export type MostReadQuery = {
  take?: number;
  excludePrint?: boolean;
  excludePremium?: boolean;
  excludeIds?: readonly string[];
  publishedByNow?: boolean;
};

function passes(
  post: CachedPost,
  opts: MostReadQuery,
  now: Date
): boolean {
  if (opts.excludePrint && post.printEditionId) return false;
  if (opts.excludePremium && post.isPremium) return false;
  if (opts.excludeIds?.includes(post.id)) return false;
  if (opts.publishedByNow) {
    if (!post.publishedAt) return false;
    if (new Date(post.publishedAt).getTime() > now.getTime()) return false;
  }
  return true;
}

export async function getMostReadPosts(opts: MostReadQuery = {}): Promise<{
  window: MostReadWindow;
  posts: MostReadPost[];
}> {
  const take = opts.take ?? 5;
  const source = await getCachedMostReadSource();
  const now = new Date(source.generatedAt);
  const byId = new Map(source.posts.map((post) => [post.id, post]));
  const rows = source.daily.flatMap((row) => {
    const post = byId.get(row.postId);
    if (!post) return [];
    return [
      {
        postId: row.postId,
        date: row.date,
        count: row.count,
        isPremium: post.isPremium,
        printEditionId: post.printEditionId,
        publishedAt: post.publishedAt,
      },
    ];
  });

  const selection = selectMostRead(rows, {
    now,
    take,
    excludePrint: opts.excludePrint,
    excludePremium: opts.excludePremium,
    excludeIds: opts.excludeIds,
    publishedByNow: opts.publishedByNow,
  });

  if (selection.window === 'all-time') {
    const posts: MostReadPost[] = [];
    for (const id of source.allTimeIds) {
      const post = byId.get(id);
      if (!post || !passes(post, opts, now)) continue;
      posts.push({ ...post, periodViews: post.views });
      if (posts.length >= take) break;
    }
    return { window: 'all-time', posts };
  }

  const posts: MostReadPost[] = [];
  for (const ranked of selection.ranking) {
    const post = byId.get(ranked.postId);
    if (!post) continue;
    posts.push({ ...post, periodViews: ranked.views });
  }
  return { window: selection.window, posts };
}

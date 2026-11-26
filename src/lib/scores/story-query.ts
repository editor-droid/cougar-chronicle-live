import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';
import { storiesForGame, storyFitsSport, type StoryRef } from './stories';
import type { ScoreGame, SportKey } from './types';

export type LinkedStory = StoryRef & { href: string };

const DAY_MS = 24 * 60 * 60 * 1000;

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date | null;
  isPremium: boolean;
  printEditionId: string | null;
};

function toStory(post: StoryRow): LinkedStory {
  return {
    id: post.id,
    title: post.title,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    href: getArticleUrl(post),
  };
}

const storySelect = {
  id: true,
  title: true,
  slug: true,
  publishedAt: true,
  isPremium: true,
  printEditionId: true,
} as const;

export async function linkedStories(game: ScoreGame): Promise<LinkedStory[]> {
  const start = Date.parse(game.start);
  const from = Number.isFinite(start) ? new Date(start - 16 * DAY_MS) : undefined;
  const to = Number.isFinite(start) ? new Date(start + 16 * DAY_MS) : undefined;
  try {
    const posts = await prisma.post.findMany({
      where: {
        state: 'PUBLISHED',
        category: 'sports',
        OR: [
          { title: { contains: game.opponent, mode: 'insensitive' } },
          ...(from && to ? [{ publishedAt: { gte: from, lte: to } }] : []),
        ],
      },
      select: storySelect,
      orderBy: { publishedAt: 'desc' },
      take: 40,
    });
    return storiesForGame(game, posts.map(toStory));
  } catch (error) {
    console.error('[sports] stories', error instanceof Error ? error.message : 'error');
    return [];
  }
}

export async function sportStories(sport: SportKey, opponents: string[]): Promise<LinkedStory[]> {
  try {
    const posts = await prisma.post.findMany({
      where: { state: 'PUBLISHED', category: 'sports' },
      select: storySelect,
      orderBy: { publishedAt: 'desc' },
      take: 60,
    });
    return posts
      .map(toStory)
      .filter((story) => storyFitsSport(story.title, sport, opponents))
      .slice(0, 6);
  } catch (error) {
    console.error('[sports] sport stories', error instanceof Error ? error.message : 'error');
    return [];
  }
}

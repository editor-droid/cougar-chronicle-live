import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';
import { isBreakingStillActive } from '@/lib/breaking';

export const revalidate = 30;

const getBreakingItem = unstable_cache(
  async () => {
    const now = new Date();
    const posts = await prisma.post.findMany({
      where: {
        state: 'PUBLISHED',
        isBreaking: true,
        publishedAt: { lte: now },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        isPremium: true,
        printEditionId: true,
        isBreaking: true,
        breakingUntil: true,
        publishedAt: true,
      },
    });

    const post = posts.find((p) => isBreakingStillActive(p, now));
    if (!post) {
      return { item: null };
    }

    return {
      item: {
        id: post.id,
        title: post.title,
        href: getArticleUrl(post),
      },
    };
  },
  ['breaking-banner'],
  { revalidate: 30 }
);

export async function GET() {
  try {
    const data = await getBreakingItem();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ item: null });
  }
}

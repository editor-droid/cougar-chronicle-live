import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import prisma from '@/lib/prisma';
import { resolvePreviewPost } from '@/lib/preview-links';
import ArticleDocument from '@/components/ArticleDocument';
import { injectHeadingIds } from '@/lib/toc';
import { enhanceArticleVideoEmbeds } from '@/lib/embed-utils';
import { getRelatedPosts } from '@/lib/related';
import { resolveStreamEmbedUrl, resolveStreamThumbnailUrl } from '@/lib/videos';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
} as const;

function readToken(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

const loadPreview = cache(async (token: string) => resolvePreviewPost(token));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  await connection();
  const { token } = await params;
  const loaded = await loadPreview(readToken(token));
  if (!loaded) {
    return { title: 'Preview', robots: ROBOTS };
  }
  return {
    title: loaded.post.seoTitle || loaded.post.title,
    description: loaded.post.seoDescription || 'Draft preview',
    robots: ROBOTS,
  };
}

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const loaded = await loadPreview(readToken(token));
  if (!loaded) notFound();

  const { post, expiresAt } = loaded;
  const html = post.content ? enhanceArticleVideoEmbeds(injectHeadingIds(post.content)) : '';

  const [relatedPosts, topPosts, sidebarVideos, nextPost, prevPost] = await Promise.all([
    getRelatedPosts(post, 3),
    prisma.post.findMany({
      where: {
        state: 'PUBLISHED',
        id: { not: post.id },
        printEditionId: null,
      },
      orderBy: { views: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        imageUrl: true,
        isPremium: true,
        isAmerica250: true,
        printEditionId: true,
        customAuthor: true,
        publishedAt: true,
        author: { select: { name: true } },
      },
    }),
    prisma.video.findMany({
      where: { isActive: true, showInSidebar: true },
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
      take: 3,
    }),
    prisma.post.findFirst({
      where: {
        state: 'PUBLISHED',
        createdAt: { gt: post.createdAt },
        printEditionId: null,
        isPremium: false,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true, slug: true, imageUrl: true, isPremium: true, printEditionId: true },
    }),
    prisma.post.findFirst({
      where: {
        state: 'PUBLISHED',
        createdAt: { lt: post.createdAt },
        printEditionId: null,
        isPremium: false,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, imageUrl: true, isPremium: true, printEditionId: true },
    }),
  ]);

  return (
    <ArticleDocument
      post={post}
      html={html}
      expiresAt={expiresAt}
      relatedPosts={relatedPosts}
      topPosts={topPosts}
      prevPost={prevPost}
      nextPost={nextPost}
      sidebarVideos={sidebarVideos.map((video) => ({
        id: video.id,
        slug: video.slug,
        title: video.title,
        description: video.description,
        platform: video.platform,
        embedUrl: resolveStreamEmbedUrl(video),
        thumbnailUrl: resolveStreamThumbnailUrl(video),
        durationSec: video.durationSec,
      }))}
    />
  );
}

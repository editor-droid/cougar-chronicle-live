import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { PUBLIC_SECTIONS, getSectionPath } from '@/lib/categories';
import { getArticleUrl } from '@/lib/routes';
import { getByuScores } from '@/lib/scores/get-byu-scores';
import { gameHref, SPORT_SPECS, teamHref } from '@/lib/scores/paths';
import type { SportKey, SportScores } from '@/lib/scores/types';

export const revalidate = 3600; // Cache for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';

  // 1. Static Routes
  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/donate',
    '/fundraiser',
    '/print-edition',
    '/america-250',
    '/byu-roc-pass',
    '/byu-cougareat',
    '/byu-honor-code',
    '/videos',
    '/links',
    '/recruiting',
    '/membership',
    '/corrections',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Section hubs — canonical top-level URLs (not /category/…)
  const categoryRoutes = PUBLIC_SECTIONS.map((section) => ({
    url: `${baseUrl}${getSectionPath(section.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  // 3. Articles — skip empty/invalid slugs (never emit /article/)
  const posts = await prisma.post.findMany({
    where: {
      state: 'PUBLISHED',
      slug: { not: '' },
    },
    select: { slug: true, updatedAt: true, printEditionId: true, isPremium: true },
  });

  const postRoutes = posts
    .filter((post) => post.slug && post.slug.trim().length > 0)
    .map((post) => ({
      url: `${baseUrl}${getArticleUrl(post)}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  // 4. Videos (include thumbnail images for richer discovery)
  const videos = await prisma.video.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true, thumbnailUrl: true, title: true },
  });

  const videoRoutes = videos.map((video) => ({
    url: `${baseUrl}/videos/${video.slug}`,
    lastModified: video.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.65,
    ...(video.thumbnailUrl
      ? {
          images: [video.thumbnailUrl],
        }
      : {}),
  }));

  const sportsRoutes = await sportsSitemapEntries(baseUrl);

  return [...staticRoutes, ...categoryRoutes, ...sportsRoutes, ...postRoutes, ...videoRoutes];
}

async function sportsSitemapEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const keys = Object.keys(SPORT_SPECS) as SportKey[];
  const routes: MetadataRoute.Sitemap = keys.map((sport) => ({
    url: `${baseUrl}${teamHref(sport)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  try {
    const payload = await getByuScores();
    if (!payload) return routes;
    const blocks: Array<SportScores | null> = [
      payload.football,
      payload.basketball,
      payload.womensBasketball,
      payload.soccer,
    ];
    for (const block of blocks) {
      if (!block) continue;
      for (const game of block.games ?? []) {
        routes.push({
          url: `${baseUrl}${gameHref(block.key, game.id)}`,
          lastModified: new Date(game.start),
          changeFrequency: game.state === 'post' ? 'weekly' : 'hourly',
          priority: game.state === 'in' ? 0.8 : 0.6,
        });
      }
    }
  } catch (error) {
    console.error('[sitemap] sports', error instanceof Error ? error.message : 'error');
  }

  return routes;
}

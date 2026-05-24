import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';

  // 1. Static Routes
  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/donate',
    '/print-edition',
    '/login',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Categories
  const postsWithCategories = await prisma.post.findMany({
    where: { state: 'PUBLISHED' },
    select: { category: true },
    distinct: ['category']
  });
  
  const categoryRoutes = postsWithCategories.map((post) => ({
    url: `${baseUrl}/category/${post.category.toLowerCase().replace(/\\s+/g, '-')}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // 3. Articles
  const posts = await prisma.post.findMany({
    where: { state: 'PUBLISHED' },
    select: { slug: true, updatedAt: true, printEditionId: true, isPremium: true }
  });

  const postRoutes = posts.map((post) => {
    let route = `/article/${post.slug}`;
    if (post.printEditionId) {
      route = `/print-edition/${post.slug}`;
    } else if (post.isPremium) {
      route = `/premium-article/${post.slug}`;
    }
    
    return {
      url: `${baseUrl}${route}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    };
  });

  return [...staticRoutes, ...categoryRoutes, ...postRoutes];
}

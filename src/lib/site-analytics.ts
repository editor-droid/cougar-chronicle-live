import prisma from '@/lib/prisma';

export type TopPost = {
  id: string;
  title: string;
  slug: string;
  views: number;
  category: string;
  publishedAt: Date | null;
  isPremium: boolean;
  printEditionId: string | null;
};

export type SiteAnalyticsSnapshot = {
  totals: {
    publishedPosts: number;
    draftPosts: number;
    totalArticleViews: number;
    subscribers: number;
    activeSubscribers: number;
    videos: number;
    videoPageViews: number;
    donationsTotal: number;
    donationCount: number;
    printOrders: number;
  };
  topPosts: TopPost[];
  viewsByCategory: { category: string; views: number; count: number }[];
  recentPublished: TopPost[];
};

export async function getSiteAnalyticsSnapshot(): Promise<SiteAnalyticsSnapshot> {
  const [
    publishedPosts,
    draftPosts,
    viewAgg,
    subscribers,
    activeSubscribers,
    videos,
    videoViews,
    donationAgg,
    printOrders,
    topPosts,
    categoryGroups,
    recentPublished,
  ] = await Promise.all([
    prisma.post.count({ where: { state: 'PUBLISHED' } }),
    prisma.post.count({ where: { state: { in: ['DRAFT', 'IN_REVIEW', 'APPROVED'] } } }),
    prisma.post.aggregate({
      where: { state: 'PUBLISHED' },
      _sum: { views: true },
    }),
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { isActive: true } }),
    prisma.video.count({ where: { isActive: true } }),
    prisma.video.aggregate({ _sum: { views: true } }),
    prisma.donation.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.printPurchase.count(),
    prisma.post.findMany({
      where: { state: 'PUBLISHED' },
      orderBy: { views: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        category: true,
        publishedAt: true,
        isPremium: true,
        printEditionId: true,
      },
    }),
    prisma.post.groupBy({
      by: ['category'],
      where: { state: 'PUBLISHED' },
      _sum: { views: true },
      _count: true,
    }),
    prisma.post.findMany({
      where: { state: 'PUBLISHED', publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        category: true,
        publishedAt: true,
        isPremium: true,
        printEditionId: true,
      },
    }),
  ]);

  return {
    totals: {
      publishedPosts,
      draftPosts,
      totalArticleViews: viewAgg._sum.views || 0,
      subscribers,
      activeSubscribers,
      videos,
      videoPageViews: videoViews._sum.views || 0,
      donationsTotal: donationAgg._sum.amount || 0,
      donationCount: donationAgg._count || 0,
      printOrders,
    },
    topPosts,
    viewsByCategory: categoryGroups
      .map((g) => ({
        category: g.category,
        views: g._sum.views || 0,
        count: g._count,
      }))
      .sort((a, b) => b.views - a.views),
    recentPublished,
  };
}

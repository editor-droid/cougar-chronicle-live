import prisma from '@/lib/prisma';

/** Simple related posts: same category first, then recent published. */
export async function getRelatedPosts(
  post: {
    id: string;
    category: string;
    isAmerica250?: boolean;
    seoKeywords?: string | null;
  },
  take = 3
) {
  const now = new Date();
  const sameCategory = await prisma.post.findMany({
    where: {
      state: 'PUBLISHED',
      publishedAt: { lte: now },
      id: { not: post.id },
      category: post.category,
    },
    orderBy: { publishedAt: 'desc' },
    take,
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
  });

  if (sameCategory.length >= take) return sameCategory;

  const exclude = [post.id, ...sameCategory.map((p) => p.id)];
  const filler = await prisma.post.findMany({
    where: {
      state: 'PUBLISHED',
      publishedAt: { lte: now },
      id: { notIn: exclude },
    },
    orderBy: { publishedAt: 'desc' },
    take: take - sameCategory.length,
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
  });

  return [...sameCategory, ...filler];
}

import prisma from '@/lib/prisma';
import {
  postsWhereForPublicHub,
  type PublicSectionSlug,
} from '@/lib/categories';
import {
  parseSectionQuery,
  SECTION_POSTS_PER_PAGE,
  type SectionSort,
} from '@/lib/section-query';

export type SectionCard = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  featuredImageAlt: string | null;
  customAuthor: string | null;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
  printEditionId: string | null;
  isPremium: boolean;
  category: string;
  dateLabel: string;
};

export type SectionPageData = {
  posts: SectionCard[];
  totalPages: number;
  page: number;
  sort: SectionSort;
};

export async function loadSectionPage(
  slug: PublicSectionSlug,
  query: { page?: string | null; sort?: string | null }
): Promise<SectionPageData> {
  const { page, sort } = parseSectionQuery(query);
  const skip = (page - 1) * SECTION_POSTS_PER_PAGE;
  const publishedWhere = {
    ...postsWhereForPublicHub(slug),
    state: 'PUBLISHED' as const,
    publishedAt: { lte: new Date() },
  };

  const [rows, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: publishedWhere,
      orderBy: { publishedAt: sort },
      include: { author: { select: { name: true } } },
      take: SECTION_POSTS_PER_PAGE,
      skip,
    }),
    prisma.post.count({ where: publishedWhere }),
  ]);

  return {
    page,
    sort,
    totalPages: Math.max(1, Math.ceil(totalPosts / SECTION_POSTS_PER_PAGE)),
    posts: rows.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      imageUrl: post.imageUrl,
      featuredImageAlt: post.featuredImageAlt,
      customAuthor: post.customAuthor,
      authorName: post.author?.name ?? null,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      createdAt: post.createdAt.toISOString(),
      printEditionId: post.printEditionId,
      isPremium: post.isPremium,
      category: post.category,
      dateLabel: new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    })),
  };
}

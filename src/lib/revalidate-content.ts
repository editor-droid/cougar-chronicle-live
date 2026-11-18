import { revalidatePath } from 'next/cache';
import { getSectionPath } from '@/lib/categories';
import { getArticleUrl } from '@/lib/routes';

/**
 * Drop cached HTML for every public surface a story can appear on.
 * Called from save, publish, unpublish, and the scheduled publish cron.
 * Premium and print URLs are included so a story that changes access
 * level does not keep a stale public copy.
 */
export function revalidateStorySurfaces(post: {
  slug: string;
  category?: string | null;
  isPremium?: boolean | null;
  printEditionId?: string | null;
  authorId?: string | null;
  isAmerica250?: boolean | null;
  author?: { slug?: string | null } | null;
}) {
  revalidatePath('/dashboard');
  revalidatePath('/');
  revalidatePath('/news');
  revalidatePath('/opinion');
  revalidatePath('/campus');
  revalidatePath('/politics');
  revalidatePath('/family');
  revalidatePath('/faith');
  revalidatePath('/sports');
  revalidatePath('/videos');
  revalidatePath('/search');
  revalidatePath('/print-edition');
  revalidatePath('/feed.xml');
  revalidatePath('/news-sitemap.xml');
  revalidatePath('/sitemap.xml');
  revalidatePath('/llms.txt');
  if (post.isAmerica250) revalidatePath('/america-250');
  if (post.category) revalidatePath(getSectionPath(post.category));
  const url = getArticleUrl({
    slug: post.slug,
    isPremium: Boolean(post.isPremium),
    printEditionId: post.printEditionId,
  });
  if (url && url !== '/') revalidatePath(url);
  // Rewrite destination. Cache entries live on the route file, not the flat URL.
  revalidatePath(`/article/${post.slug}`);
  revalidatePath(`/premium-article/${post.slug}`);
  revalidatePath(`/print-edition/${post.slug}`);
  if (post.authorId) revalidatePath(`/author/${post.authorId}`);
  if (post.author?.slug) revalidatePath(`/author/${post.author.slug}`);
}

/**
 * Canonical public path for a story.
 *
 * Free articles: flat `/{slug}` (newsroom-style; no /article/ prefix).
 * Premium / print keep dedicated prefixes (paywall + product clarity).
 *
 * Legacy `/article/{slug}` permanently redirects here (see next.config + article page).
 */
export function getArticleUrl(post: {
  slug: string;
  isPremium?: boolean;
  printEditionId?: string | null;
}): string {
  const slug = String(post.slug || '').replace(/^\/+|\/+$/g, '');
  if (!slug) return '/';
  if (post.printEditionId) {
    return `/print-edition/${slug}`;
  }
  if (post.isPremium) {
    return `/premium-article/${slug}`;
  }
  return `/${slug}`;
}

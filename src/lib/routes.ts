export function getArticleUrl(post: { slug: string; isPremium?: boolean; printEditionId?: string | null }): string {
  if (post.printEditionId) {
    return `/print-edition/${post.slug}`;
  }
  if (post.isPremium) {
    return `/premium-article/${post.slug}`;
  }
  return `/article/${post.slug}`;
}

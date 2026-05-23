export function getArticleUrl(post: { slug: string; isPremium?: boolean }): string {
  if (post.isPremium) {
    return `/premium-article/${post.slug}`;
  }
  return `/article/${post.slug}`;
}

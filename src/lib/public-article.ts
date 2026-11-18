/**
 * The public article route (`/{slug}` → `/article/[slug]`) only renders
 * free stories. Premium and print editions redirect to their own routes,
 * which stay dynamic so access checks are never served from a shared cache.
 */
export function isPublicFreeArticle(post: {
  isPremium?: boolean | null;
  printEditionId?: string | null;
}): boolean {
  return !post.isPremium && !post.printEditionId;
}

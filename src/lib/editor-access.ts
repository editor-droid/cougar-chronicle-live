import { canAccessDashboard, canEditAllPosts } from '@/lib/roles';

/**
 * Same rules as savePost: staff only, and writers only touch their own posts.
 */
export function assertCanEditPost(
  role: string | null | undefined,
  userId: string | null | undefined,
  post: { authorId: string } | null
): asserts post is { authorId: string } {
  if (!userId || !canAccessDashboard(role)) {
    throw new Error('Unauthorized role');
  }
  if (!post) throw new Error('Post not found');
  if (!canEditAllPosts(role) && post.authorId !== userId) {
    throw new Error('You can only edit your own posts');
  }
}

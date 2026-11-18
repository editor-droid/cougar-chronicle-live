export const CHAT_MAX_INPUT_CHARS = 4000;

/**
 * Free, published stories only. Premium and print copies are paywalled and
 * must not be copied into the public chatbot prompt.
 */
export const publicChatArticleWhere = {
  state: 'PUBLISHED' as const,
  isPremium: false,
  printEditionId: null,
};

export function isPublicChatArticle(post: {
  state?: string | null;
  isPremium?: boolean | null;
  printEditionId?: string | null;
}): boolean {
  return post.state === 'PUBLISHED' && post.isPremium !== true && !post.printEditionId;
}

/** Current-page context is only for free article URLs, never premium or print. */
export function chatMayUseArticlePath(pathname: unknown): pathname is string {
  if (typeof pathname !== 'string' || pathname.length === 0 || pathname.length > 300) {
    return false;
  }
  if (
    pathname.startsWith('/premium-article') ||
    pathname.startsWith('/print-edition')
  ) {
    return false;
  }
  return (
    pathname.startsWith('/article/') ||
    /^\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/i.test(pathname)
  );
}

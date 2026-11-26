/**
 * Editor draft shape shared by autosave, crash recovery, and revision restore.
 * Equality is value-based so a new object each render is not a new edit.
 */

export type EditorChecklist = Record<string, boolean>;

export type EditorDraft = {
  title: string;
  slug: string;
  category: string;
  format: 'news' | 'opinion';
  content: string;
  imageUrl: string;
  authorId: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  keyInsights: string;
  featuredImageAlt: string;
  customAuthor: string;
  isPremium: boolean;
  showDonateCta: boolean;
  isAmerica250: boolean;
  isBreaking: boolean;
  breakingHours: number | '';
  printEditionId: string;
  printEditionOrder: string;
  imageCaption: string;
  editorChecklist: EditorChecklist;
  publishedAt: string;
  /** ESPN event id, or empty when the story should match a game automatically. */
  espnEventId?: string;
};

export type LocalEditorCopy = {
  savedAt: number;
  /** Server `updatedAt` this copy was based on, ISO when known. */
  serverUpdatedAt: string | null;
  draft: EditorDraft;
};

const CHECKLIST_KEYS = ['spellcheck', 'seo', 'formatting', 'oneWordLinks', 'ready'] as const;

export function editorDraftStorageKey(postId: string | undefined, authorId: string): string {
  return postId ? `cc-editor-draft:${postId}` : `cc-editor-draft:new:${authorId}`;
}

function checklistEqual(a: EditorChecklist, b: EditorChecklist): boolean {
  for (const key of CHECKLIST_KEYS) {
    if (Boolean(a?.[key]) !== Boolean(b?.[key])) return false;
  }
  return true;
}

export function draftsEqual(a: EditorDraft, b: EditorDraft): boolean {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.category === b.category &&
    a.format === b.format &&
    a.content === b.content &&
    a.imageUrl === b.imageUrl &&
    a.authorId === b.authorId &&
    a.seoTitle === b.seoTitle &&
    a.seoDescription === b.seoDescription &&
    a.seoKeywords === b.seoKeywords &&
    a.keyInsights === b.keyInsights &&
    a.featuredImageAlt === b.featuredImageAlt &&
    a.customAuthor === b.customAuthor &&
    a.isPremium === b.isPremium &&
    a.showDonateCta === b.showDonateCta &&
    a.isAmerica250 === b.isAmerica250 &&
    a.isBreaking === b.isBreaking &&
    a.breakingHours === b.breakingHours &&
    a.printEditionId === b.printEditionId &&
    a.printEditionOrder === b.printEditionOrder &&
    a.imageCaption === b.imageCaption &&
    a.publishedAt === b.publishedAt &&
    (a.espnEventId || '') === (b.espnEventId || '') &&
    checklistEqual(a.editorChecklist, b.editorChecklist)
  );
}

export function excerptFrom(seoDescription: string | null | undefined, content: string | null | undefined): string | null {
  const seo = (seoDescription || '').trim();
  if (seo) return seo.slice(0, 500);
  if (!content) return null;
  const plain = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain ? plain.slice(0, 280) : null;
}

/**
 * Offer restore when this browser holds edits newer than the copy loaded
 * from the server. A newer server save wins so we do not clobber someone else.
 */
export function shouldOfferRestore(
  local: LocalEditorCopy | null,
  serverUpdatedAt: string | null,
  serverDraft: EditorDraft
): boolean {
  if (!local?.draft) return false;
  if (draftsEqual(local.draft, serverDraft)) return false;
  if (!serverUpdatedAt) return true;
  if (local.serverUpdatedAt && local.serverUpdatedAt === serverUpdatedAt) return true;
  const serverTime = Date.parse(serverUpdatedAt);
  return Number.isFinite(serverTime) && local.savedAt > serverTime;
}

export function sameTimestamp(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined
): boolean {
  if (a == null || b == null) return false;
  const am = new Date(a).getTime();
  const bm = new Date(b).getTime();
  return Number.isFinite(am) && am === bm;
}

export function toDatetimeLocal(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

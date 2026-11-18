import prisma from '@/lib/prisma';
import { excerptFrom, type EditorDraft } from '@/lib/editor-draft';
import {
  MAX_REVISIONS_PER_POST,
  revisionIdsToPrune,
  shouldKeepAutosaveRevision,
} from '@/lib/revisions';

export type RevisionSource = 'MANUAL' | 'AUTOSAVE' | 'STATUS';

type Snapshot = {
  title: string;
  content: string | null;
  excerpt: string | null;
  slug: string | null;
  category: string | null;
  format: string | null;
  imageUrl: string | null;
  imageCaption: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  keyInsights: string | null;
  featuredImageAlt: string | null;
  customAuthor: string | null;
  isPremium: boolean | null;
  isAmerica250: boolean | null;
  isBreaking: boolean | null;
  showDonateCta: boolean | null;
  printEditionId: string | null;
  printEditionOrder: number | null;
  editorChecklist: string | null;
  publishedAt: Date | null;
  postAuthorId: string | null;
  state: string | null;
};

function checklistString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function publishedDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function orderOf(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function insertAndPrune(
  postId: string,
  authorId: string,
  source: RevisionSource,
  snapshot: Snapshot
) {
  await prisma.$transaction(async (tx) => {
    await tx.postRevision.create({
      data: {
        postId,
        authorId,
        source,
        title: snapshot.title,
        content: snapshot.content,
        excerpt: snapshot.excerpt,
        slug: snapshot.slug,
        category: snapshot.category,
        format: snapshot.format,
        imageUrl: snapshot.imageUrl,
        imageCaption: snapshot.imageCaption,
        seoTitle: snapshot.seoTitle,
        seoDescription: snapshot.seoDescription,
        seoKeywords: snapshot.seoKeywords,
        keyInsights: snapshot.keyInsights,
        featuredImageAlt: snapshot.featuredImageAlt,
        customAuthor: snapshot.customAuthor,
        isPremium: snapshot.isPremium,
        isAmerica250: snapshot.isAmerica250,
        isBreaking: snapshot.isBreaking,
        showDonateCta: snapshot.showDonateCta,
        printEditionId: snapshot.printEditionId,
        printEditionOrder: snapshot.printEditionOrder,
        editorChecklist: snapshot.editorChecklist,
        publishedAt: snapshot.publishedAt,
        postAuthorId: snapshot.postAuthorId,
        state: snapshot.state,
      },
    });

    const rows = await tx.postRevision.findMany({
      where: { postId },
      select: { id: true, createdAt: true },
    });
    const drop = revisionIdsToPrune(
      rows.map((row) => ({ id: row.id, createdAt: row.createdAt.getTime() })),
      MAX_REVISIONS_PER_POST
    );
    if (drop.length > 0) {
      await tx.postRevision.deleteMany({ where: { id: { in: drop } } });
    }
  });
}

async function autosaveAllowed(postId: string, now: number): Promise<boolean> {
  const last = await prisma.postRevision.findFirst({
    where: { postId, source: 'AUTOSAVE' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  return shouldKeepAutosaveRevision(last ? last.createdAt.getTime() : null, now);
}

/** Snapshot the saved post. Does not change the post. */
export async function capturePostRevision(opts: {
  postId: string;
  authorId: string;
  source: RevisionSource;
  now?: number;
}): Promise<{ recorded: boolean }> {
  const now = opts.now ?? Date.now();
  if (opts.source === 'AUTOSAVE' && !(await autosaveAllowed(opts.postId, now))) {
    return { recorded: false };
  }

  const post = await prisma.post.findUnique({ where: { id: opts.postId } });
  if (!post) return { recorded: false };

  await insertAndPrune(post.id, opts.authorId, opts.source, {
    title: post.title,
    content: post.content,
    excerpt: excerptFrom(post.seoDescription, post.content),
    slug: post.slug,
    category: post.category,
    format: post.format,
    imageUrl: post.imageUrl,
    imageCaption: post.imageCaption,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    seoKeywords: post.seoKeywords,
    keyInsights: post.keyInsights,
    featuredImageAlt: post.featuredImageAlt,
    customAuthor: post.customAuthor,
    isPremium: post.isPremium,
    isAmerica250: post.isAmerica250,
    isBreaking: post.isBreaking,
    showDonateCta: post.showDonateCta,
    printEditionId: post.printEditionId,
    printEditionOrder: post.printEditionOrder,
    editorChecklist: post.editorChecklist,
    publishedAt: post.publishedAt,
    postAuthorId: post.authorId,
    state: post.state,
  });
  return { recorded: true };
}

/**
 * Snapshot editor fields without writing the post. Used when a published
 * story autosaves, so readers keep seeing the last manual save.
 */
export async function captureDraftRevision(opts: {
  postId: string;
  authorId: string;
  state: string | null;
  draft: Partial<EditorDraft>;
  now?: number;
}): Promise<{ recorded: boolean }> {
  const now = opts.now ?? Date.now();
  if (!(await autosaveAllowed(opts.postId, now))) return { recorded: false };

  const content = opts.draft.content ?? null;
  const seoDescription = opts.draft.seoDescription ?? null;
  await insertAndPrune(opts.postId, opts.authorId, 'AUTOSAVE', {
    title: String(opts.draft.title || 'Untitled'),
    content,
    excerpt: excerptFrom(seoDescription, content),
    slug: opts.draft.slug || null,
    category: opts.draft.category || null,
    format: opts.draft.format === 'opinion' ? 'opinion' : opts.draft.format || null,
    imageUrl: opts.draft.imageUrl || null,
    imageCaption: opts.draft.imageCaption || null,
    seoTitle: opts.draft.seoTitle || null,
    seoDescription: seoDescription || null,
    seoKeywords: opts.draft.seoKeywords || null,
    keyInsights: opts.draft.keyInsights || null,
    featuredImageAlt: opts.draft.featuredImageAlt || null,
    customAuthor: opts.draft.customAuthor || null,
    isPremium: Boolean(opts.draft.isPremium),
    isAmerica250: Boolean(opts.draft.isAmerica250),
    isBreaking: Boolean(opts.draft.isBreaking),
    showDonateCta: opts.draft.showDonateCta !== false,
    printEditionId: opts.draft.printEditionId || null,
    printEditionOrder: orderOf(opts.draft.printEditionOrder),
    editorChecklist: checklistString(opts.draft.editorChecklist),
    publishedAt: publishedDate(opts.draft.publishedAt),
    postAuthorId: opts.draft.authorId || null,
    state: opts.state,
  });
  return { recorded: true };
}

const listSelect = {
  id: true,
  title: true,
  excerpt: true,
  source: true,
  state: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} as const;

export async function listPostRevisions(postId: string) {
  return prisma.postRevision.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
    take: MAX_REVISIONS_PER_POST,
    select: listSelect,
  });
}

export async function getPostRevision(postId: string, id: string) {
  return prisma.postRevision.findFirst({
    where: { id, postId },
    include: { author: { select: { id: true, name: true } } },
  });
}

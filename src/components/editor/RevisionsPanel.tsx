'use client';

import { memo, useEffect, useState } from 'react';
import styles from '@/app/dashboard/editor/[id]/EditorForm.module.css';
import { toDatetimeLocal, type EditorDraft } from '@/lib/editor-draft';

type ListItem = {
  id: string;
  title: string;
  excerpt: string | null;
  source: string;
  state: string | null;
  createdAt: string;
  author: { id: string; name: string | null } | null;
};

type FullRevision = ListItem & {
  content: string | null;
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
  publishedAt: string | null;
  postAuthorId: string | null;
};

function sourceLabel(source: string): string {
  if (source === 'AUTOSAVE') return 'Autosave';
  if (source === 'STATUS') return 'Status';
  return 'Manual save';
}

export function revisionToDraft(revision: FullRevision, fallbackAuthorId: string): EditorDraft {
  let checklist: EditorDraft['editorChecklist'] = {};
  if (revision.editorChecklist) {
    try {
      const parsed = JSON.parse(revision.editorChecklist) as EditorDraft['editorChecklist'];
      if (parsed && typeof parsed === 'object') checklist = parsed;
    } catch {
      checklist = {};
    }
  }
  return {
    title: revision.title || '',
    slug: revision.slug || '',
    category: revision.category || 'campus',
    format: revision.format === 'opinion' ? 'opinion' : 'news',
    content: revision.content || '',
    imageUrl: revision.imageUrl || '',
    authorId: revision.postAuthorId || fallbackAuthorId,
    seoTitle: revision.seoTitle || '',
    seoDescription: revision.seoDescription || '',
    seoKeywords: revision.seoKeywords || '',
    keyInsights: revision.keyInsights || '',
    featuredImageAlt: revision.featuredImageAlt || '',
    customAuthor: revision.customAuthor || '',
    isPremium: Boolean(revision.isPremium),
    showDonateCta: revision.showDonateCta !== false,
    isAmerica250: Boolean(revision.isAmerica250),
    isBreaking: Boolean(revision.isBreaking),
    breakingHours: 24,
    printEditionId: revision.printEditionId || '',
    printEditionOrder:
      revision.printEditionOrder == null ? '' : String(revision.printEditionOrder),
    imageCaption: revision.imageCaption || '',
    editorChecklist: checklist,
    publishedAt: toDatetimeLocal(revision.publishedAt),
  };
}

function RevisionsPanel({
  postId,
  authorId,
  onRestore,
}: {
  postId?: string;
  authorId: string;
  onRestore: (draft: EditorDraft) => void;
}) {
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<FullRevision | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/posts/revisions?postId=${encodeURIComponent(postId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not load history');
        if (!cancelled) setItems(json.revisions || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load history');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function openRevision(id: string) {
    if (!postId) return;
    setLoadingId(id);
    setError('');
    try {
      const res = await fetch(
        `/api/dashboard/posts/revisions?postId=${encodeURIComponent(postId)}&revisionId=${encodeURIComponent(id)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not open that revision');
      setView(json.revision);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that revision');
    } finally {
      setLoadingId(null);
    }
  }

  if (!postId) {
    return <p className={styles.panelHint}>Save the draft once to start history.</p>;
  }

  return (
    <div className={styles.revisionList}>
      {note ? <p className={styles.panelHint}>{note}</p> : null}
      {error ? <p className={styles.panelHint}>{error}</p> : null}
      {items === null && !error ? <p className={styles.panelHint}>Loading history…</p> : null}
      {items && items.length === 0 ? (
        <p className={styles.panelHint}>No revisions yet. A manual save or status change records one.</p>
      ) : null}
      {items?.map((item) => {
        const when = new Date(item.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        const open = view?.id === item.id;
        return (
          <article key={item.id} className={styles.revisionItem}>
            <div className={styles.revisionMeta}>
              {when} · {item.author?.name || 'Staff'} · {sourceLabel(item.source)}
              {item.state ? ` · ${item.state}` : ''}
            </div>
            <div style={{ fontWeight: 650, marginTop: '0.2rem' }}>{item.title || 'Untitled'}</div>
            {item.excerpt ? <p className={styles.revisionMeta}>{item.excerpt}</p> : null}
            <div className={styles.revisionActions}>
              <button type="button" className={`${styles.headerButton} ${styles.btnSave}`} onClick={() => openRevision(item.id)}>
                {loadingId === item.id ? 'Opening…' : open ? 'Hide' : 'View'}
              </button>
              {open && view ? (
                <button
                  type="button"
                  className={`${styles.headerButton} ${styles.btnSave}`}
                  onClick={() => {
                    onRestore(revisionToDraft(view, authorId));
                    setNote('Loaded into the editor. Save to keep it.');
                  }}
                >
                  Restore
                </button>
              ) : null}
            </div>
            {open && view ? (
              <div
                className={styles.revisionView}
                dangerouslySetInnerHTML={{ __html: view.content || '<p>Empty revision.</p>' }}
              />
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export default memo(RevisionsPanel);

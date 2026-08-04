'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FilePlus, GripVertical, Plus } from 'lucide-react';
import { createDraftForPrintEdition, setPostPrintEdition, updatePostPrintOrder } from './actions';

export type EditionPost = {
  id: string;
  title: string;
  slug: string;
  state: string;
  category: string;
  printEditionOrder: number | null;
  authorName: string | null;
};

export type AssignablePost = {
  id: string;
  title: string;
  state: string;
  category: string;
};

function stateBadge(state: string) {
  if (state === 'PUBLISHED') return 'dash-badge dash-badge-green';
  if (state === 'IN_REVIEW' || state === 'APPROVED') return 'dash-badge dash-badge-amber';
  return 'dash-badge';
}

export default function EditionArticles({
  editionId,
  posts,
  assignable,
}: {
  editionId: string;
  posts: EditionPost[];
  assignable: AssignablePost[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [addId, setAddId] = useState('');
  const [orders, setOrders] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of posts) {
      init[p.id] = p.printEditionOrder != null ? String(p.printEditionOrder) : '';
    }
    return init;
  });

  const sorted = useMemo(() => {
    return [...posts].sort((a, b) => {
      const ao = a.printEditionOrder ?? 9999;
      const bo = b.printEditionOrder ?? 9999;
      if (ao !== bo) return ao - bo;
      return a.title.localeCompare(b.title);
    });
  }, [posts]);

  return (
    <div style={{ marginTop: '1.75rem' }}>
      {/* Workflow strip */}
      <div className="dash-card" style={{ padding: '1.15rem 1.25rem', marginBottom: '1.25rem' }}>
        <p
          className="font-sans"
          style={{
            margin: '0 0 0.35rem',
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6b7280',
          }}
        >
          Print workflow
        </p>
        <h2 className="font-serif" style={{ fontSize: '1.35rem', margin: '0 0 0.5rem', color: '#1B2253' }}>
          Articles in this edition
        </h2>
        <ol
          className="font-sans text-muted"
          style={{ margin: '0 0 1rem', paddingLeft: '1.15rem', fontSize: '0.88rem', lineHeight: 1.55 }}
        >
          <li>
            <strong style={{ color: 'var(--foreground)' }}>Create a draft from here</strong> — it opens the editor already
            linked (Premium on, order set).
          </li>
          <li>
            <strong style={{ color: 'var(--foreground)' }}>Write &amp; checklist</strong> in the editor, then save.
          </li>
          <li>
            <strong style={{ color: 'var(--foreground)' }}>Reorder</strong> with the # field (table of contents order).
          </li>
          <li>
            Upload the <strong style={{ color: 'var(--foreground)' }}>PDF &amp; cover</strong> in settings above when ready.
          </li>
        </ol>

        <div className="dash-row-actions">
          <button
            type="button"
            className="dash-btn dash-btn-primary"
            disabled={pending}
            onClick={() => {
              setMessage('');
              startTransition(async () => {
                try {
                  const { postId } = await createDraftForPrintEdition(editionId);
                  router.push(`/dashboard/editor/${postId}`);
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : 'Could not create draft');
                }
              });
            }}
          >
            <FilePlus size={16} />
            {pending ? 'Creating…' : 'New article in this edition'}
          </button>
          <span className="dash-badge dash-badge-navy">
            {posts.length} article{posts.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {message && (
        <p
          className="font-sans"
          style={{
            marginBottom: '0.85rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '0.65rem',
            background: /fail|error/i.test(message) ? 'rgba(185,28,28,0.08)' : 'rgba(5,150,105,0.1)',
            color: /fail|error/i.test(message) ? '#991b1b' : '#065f46',
            fontSize: '0.9rem',
          }}
        >
          {message}
        </p>
      )}

      {sorted.length === 0 ? (
        <div className="dash-empty dash-card" style={{ marginBottom: '1.25rem' }}>
          No articles yet. Use <strong>New article in this edition</strong> so the piece is linked automatically.
        </div>
      ) : (
        <div className="dash-card" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
          <div className="dash-card-header">
            <h3 className="dash-section-title">Table of contents</h3>
            <span className="font-sans text-muted" style={{ fontSize: '0.8rem' }}>
              Drag-order via #
            </span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {sorted.map((p, i) => (
              <li
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto auto minmax(0, 1fr) auto auto auto',
                  gap: '0.65rem',
                  alignItems: 'center',
                  padding: '0.85rem 1.1rem',
                  borderBottom: i === sorted.length - 1 ? 'none' : '1px solid #f0f1f5',
                }}
              >
                <GripVertical size={16} style={{ color: '#c5cad6' }} aria-hidden />
                <span
                  className="font-sans"
                  style={{
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: '#1B2253',
                    minWidth: '1.5rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {orders[p.id] || p.printEditionOrder || i + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <Link
                    href={`/dashboard/editor/${p.id}`}
                    className="dash-title-link"
                    style={{ display: 'block' }}
                  >
                    {p.title}
                  </Link>
                  <p className="font-sans text-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.78rem' }}>
                    {p.category}
                    {p.authorName ? ` · ${p.authorName}` : ''}
                  </p>
                </div>
                <span className={stateBadge(p.state)}>{p.state}</span>
                <input
                  type="number"
                  title="Order in edition"
                  value={orders[p.id] ?? ''}
                  onChange={(e) => setOrders((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  onBlur={() => {
                    const raw = orders[p.id];
                    const n = raw === '' ? null : parseInt(raw, 10);
                    if (n !== null && Number.isNaN(n)) return;
                    startTransition(async () => {
                      try {
                        await updatePostPrintOrder({ postId: p.id, printEditionOrder: n });
                        router.refresh();
                      } catch (e) {
                        setMessage(e instanceof Error ? e.message : 'Order update failed');
                      }
                    });
                  }}
                  className="font-sans"
                  style={{
                    width: 56,
                    padding: '0.4rem 0.45rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e8eaf0',
                    background: '#fafbfd',
                    fontSize: '0.85rem',
                  }}
                  placeholder="#"
                />
                <div className="dash-row-actions">
                  <Link href={`/dashboard/editor/${p.id}`} className="dash-btn dash-btn-primary">
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={pending}
                    className="dash-btn"
                    style={{ color: '#991b1b' }}
                    onClick={() => {
                      setMessage('');
                      startTransition(async () => {
                        try {
                          await setPostPrintEdition({ postId: p.id, printEditionId: null });
                          setMessage('Removed from edition.');
                          router.refresh();
                        } catch (e) {
                          setMessage(e instanceof Error ? e.message : 'Remove failed');
                        }
                      });
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="dash-card" style={{ padding: '1.15rem 1.25rem' }}>
        <h3 className="font-sans" style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
          Or add an existing post
        </h3>
        <p className="font-sans text-muted" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
          Only posts that aren&apos;t already in another edition.
        </p>
        {assignable.length === 0 ? (
          <p className="font-sans text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            No other posts available.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
              className="font-sans"
              style={{
                flex: '1 1 240px',
                padding: '0.65rem 0.75rem',
                borderRadius: '0.65rem',
                border: '1px solid #e8eaf0',
                background: 'var(--surface-hover)',
                fontSize: '0.9rem',
              }}
            >
              <option value="">Select a post…</option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.state} · {p.category})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="dash-btn dash-btn-primary"
              disabled={pending || !addId}
              onClick={() => {
                if (!addId) return;
                setMessage('');
                startTransition(async () => {
                  try {
                    const nextOrder =
                      Math.max(0, ...posts.map((p) => p.printEditionOrder ?? 0)) + 1;
                    await setPostPrintEdition({
                      postId: addId,
                      printEditionId: editionId,
                      printEditionOrder: nextOrder,
                    });
                    setAddId('');
                    setMessage('Article added to edition.');
                    router.refresh();
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : 'Add failed');
                  }
                });
              }}
            >
              <Plus size={16} />
              {pending ? 'Adding…' : 'Add to edition'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

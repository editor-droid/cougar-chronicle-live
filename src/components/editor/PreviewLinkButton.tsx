'use client';

import { memo, useState } from 'react';
import { Link2 } from 'lucide-react';
import styles from '@/app/dashboard/editor/[id]/EditorForm.module.css';

const REVOKED = 'revoked';

type LinkRow = {
  id: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

function PreviewLinkButton({ postId, postState }: { postId?: string; postState?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [path, setPath] = useState('');
  const [expires, setExpires] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);

  if (!postId || postState === 'PUBLISHED') return null;

  async function load() {
    const res = await fetch(`/api/dashboard/posts/preview-link?postId=${encodeURIComponent(postId!)}`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) setLinks(json.links || []);
  }

  async function createLink() {
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      const res = await fetch('/api/dashboard/posts/preview-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not create a preview link');
      const nextPath = String(json.path || '');
      setPath(nextPath);
      setExpires(json.expiresAt || '');
      const absolute = `${window.location.origin}${nextPath}`;
      try {
        await navigator.clipboard.writeText(absolute);
        setCopied(true);
      } catch {
        setCopied(false);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a preview link');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError('');
    const res = await fetch('/api/dashboard/posts/preview-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, revokeId: id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'Could not revoke that link');
      return;
    }
    setLinks((current) => current.map((link) => (link.id === id ? { ...link, revokedAt: REVOKED } : link)));
  }

  const active = links.filter((link) => !link.revokedAt);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className={`${styles.headerButton} ${styles.btnSave}`}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
      >
        <Link2 size={16} /> Preview link
      </button>
      {open ? (
        <div className={styles.previewPop}>
          <p className={styles.panelHint} style={{ marginTop: 0 }}>
            A private link to this draft. It expires in 7 days, stays out of search, and does not count views.
          </p>
          <button type="button" className="btn btn-primary font-sans text-sm" disabled={busy} onClick={() => void createLink()}>
            {busy ? 'Creating…' : 'Copy preview link'}
          </button>
          {path ? (
            <p className={styles.revisionMeta} style={{ marginTop: '0.65rem', wordBreak: 'break-all' }}>
              {copied ? 'Copied. ' : ''}
              {expires ? `Expires ${new Date(expires).toLocaleString()}. ` : ''}
              {path}
            </p>
          ) : null}
          {error ? <p className={styles.panelHint}>{error}</p> : null}
          {active.length > 0 ? (
            <ul className={styles.revisionList} style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none' }}>
              {active.map((link) => (
                <li key={link.id} className={styles.revisionMeta} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span>Expires {new Date(link.expiresAt).toLocaleDateString()}</span>
                  <button type="button" className={styles.headerButton} onClick={() => void revoke(link.id)}>
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default memo(PreviewLinkButton);

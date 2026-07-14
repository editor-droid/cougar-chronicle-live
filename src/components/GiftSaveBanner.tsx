'use client';

import Link from 'next/link';
import { useState } from 'react';

/**
 * Soft prompt when someone is reading via a gift unlock cookie —
 * no hard wall, just a path to keep access if they clear cookies.
 */
export default function GiftSaveBanner({ articleTitle }: { articleTitle?: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="status"
      style={{
        marginBottom: '1.5rem',
        padding: '1rem 1.15rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--border)',
        background: '#f0f4ff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
    >
      <div style={{ flex: '1 1 14rem', minWidth: 0 }}>
        <p className="font-sans font-bold" style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', color: 'var(--primary)' }}>
          This story was gifted to you
        </p>
        <p className="font-sans text-sm text-muted" style={{ margin: 0, lineHeight: 1.45 }}>
          Keep access if you clear your browser — create a free account, or become a Member for unlimited
          stories{articleTitle ? '' : ''}.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <Link
          href="/register"
          className="btn btn-primary font-sans text-sm"
          style={{ textDecoration: 'none' }}
        >
          Free account
        </Link>
        <Link
          href="/membership"
          className="btn btn-secondary font-sans text-sm"
          style={{ textDecoration: 'none' }}
        >
          Become a Member
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="font-sans text-xs text-muted"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem' }}
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

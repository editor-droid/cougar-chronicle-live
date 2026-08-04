'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { OpenRole } from '@/lib/site-content-types';

function interestHref(title: string) {
  return `/recruiting?interest=${encodeURIComponent(title)}#apply`;
}

/**
 * Compact tabbed chips from admin open roles — Roles | Beats.
 */
export default function ApplyInterestPicker({ roles }: { roles: OpenRole[] }) {
  const roleItems = roles.filter((r) => r.kind === 'role' && r.isOpen && r.title.trim());
  const beatItems = roles.filter((r) => r.kind === 'beat' && r.isOpen && r.title.trim());
  const hasBeats = beatItems.length > 0;
  const hasRoles = roleItems.length > 0;
  const [tab, setTab] = useState<'roles' | 'beats'>(hasRoles ? 'roles' : 'beats');

  const items = tab === 'roles' ? roleItems : beatItems;

  if (!hasRoles && !hasBeats) {
    return (
      <div
        className="font-sans text-muted"
        style={{
          marginBottom: '1.5rem',
          padding: '1.25rem',
          borderRadius: '1rem',
          border: '1px dashed var(--border)',
          textAlign: 'center',
        }}
      >
        No open positions right now. Check back soon, or email editor@thecougarchronicle.com.
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1.15rem 1.2rem 1.25rem',
        borderRadius: '1rem',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '0.85rem',
        }}
      >
        <div>
          <h2 className="font-serif" style={{ fontSize: '1.3rem', margin: '0 0 0.25rem', color: 'var(--primary)' }}>
            Open positions
          </h2>
          <p className="font-sans text-muted" style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
            Tap one to prefill your application — same list as the form below.
          </p>
        </div>
        {hasRoles && hasBeats && (
          <div
            style={{
              display: 'inline-flex',
              padding: '0.25rem',
              borderRadius: '999px',
              background: 'var(--surface-hover)',
              gap: '0.2rem',
            }}
          >
            {(
              [
                ['roles', 'Roles'],
                ['beats', 'Beats'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="font-sans"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.4rem 0.95rem',
                  borderRadius: '999px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: tab === id ? 'var(--primary)' : 'transparent',
                  color: tab === id ? '#fff' : 'var(--muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {items.map((r) => (
          <Link
            key={r.id}
            href={interestHref(r.title)}
            className="font-sans"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.7rem 0.8rem',
              borderRadius: '0.65rem',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 600,
              fontSize: '0.88rem',
              lineHeight: 1.3,
            }}
          >
            <span style={{ minWidth: 0 }}>{r.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

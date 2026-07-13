'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type BreakingItem = {
  title: string;
  href: string;
  id: string;
};

export default function BreakingBanner({ item }: { item: BreakingItem | null }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!item) return;
    try {
      if (sessionStorage.getItem(`breaking_dismissed_${item.id}`) === '1') {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, [item]);

  if (!item || dismissed) return null;

  return (
    <div
      role="status"
      style={{
        backgroundColor: '#1B2253',
        color: '#fff',
        borderBottom: '3px solid #b91c1c',
        padding: '0.65rem 1rem',
        paddingTop: '0.65rem',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href={item.href}
          style={{
            color: '#fff',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.75rem',
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            className="font-sans"
            style={{
              background: '#b91c1c',
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              padding: '0.2rem 0.45rem',
              borderRadius: '0.2rem',
              flexShrink: 0,
            }}
          >
            BREAKING
          </span>
          <span
            className="font-serif"
            style={{
              fontSize: '1.05rem',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.title}
          </span>
        </Link>
        <button
          type="button"
          aria-label="Dismiss breaking banner"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(`breaking_dismissed_${item.id}`, '1');
            } catch {
              /* ignore */
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.85)',
            cursor: 'pointer',
            fontSize: '1.25rem',
            lineHeight: 1,
            padding: '0.25rem',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

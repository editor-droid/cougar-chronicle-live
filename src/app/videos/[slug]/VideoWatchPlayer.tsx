'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type NavVideo = {
  slug: string;
  title: string;
};

type Props = {
  title: string;
  embedUrl: string;
  portrait: boolean;
  aspect: string;
  prev: NavVideo | null;
  next: NavVideo | null;
};

/**
 * Watch player with portrait-friendly sizing and next/prev (reels-style) nav.
 */
export default function VideoWatchPlayer({
  title,
  embedUrl,
  portrait,
  aspect,
  prev,
  next,
}: Props) {
  const router = useRouter();

  const goNext = useCallback(() => {
    if (next) router.push(`/videos/${next.slug}`);
  }, [next, router]);

  const goPrev = useCallback(() => {
    if (prev) router.push(`/videos/${prev.slug}`);
  }, [prev, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: portrait ? 'center' : 'stretch',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}
    >
      <div
        style={{
          position: 'relative',
          // Portrait: short phone frame so full clip fits without dominating the page
          ...(portrait
            ? {
                height: 'min(38vh, 340px)',
                width: 'auto',
                aspectRatio: aspect,
                maxWidth: 'min(100%, 220px)',
              }
            : {
                width: '100%',
                aspectRatio: aspect,
                maxHeight: 'min(70vh, 640px)',
              }),
          backgroundColor: portrait ? 'transparent' : 'var(--surface-hover)',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: portrait
            ? '0 10px 32px rgba(0,0,0,0.12)'
            : '0 4px 20px rgba(0,0,0,0.06)',
          margin: portrait ? '0 auto' : undefined,
        }}
      >
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          loading="eager"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 0,
            background: 'transparent',
          }}
        />
      </div>

      {/* Next / Prev — Instagram-ish, not a full-screen TikTok app */}
      {(prev || next) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: portrait ? 'center' : 'space-between',
            gap: '0.65rem',
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: portrait ? '420px' : '100%',
          }}
        >
          {prev ? (
            <Link
              href={`/videos/${prev.slug}`}
              className="font-sans"
              style={{
                flex: portrait ? '1 1 140px' : '1 1 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minHeight: 48,
                padding: '0.65rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--foreground)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              <ChevronLeft size={20} style={{ flexShrink: 0 }} />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', fontWeight: 700 }}>
                  Previous
                </span>
                {prev.title}
              </span>
            </Link>
          ) : (
            <div style={{ flex: 1 }} />
          )}

          {next ? (
            <Link
              href={`/videos/${next.slug}`}
              className="font-sans"
              style={{
                flex: portrait ? '1 1 140px' : '1 1 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.5rem',
                minHeight: 48,
                padding: '0.65rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid var(--primary)',
                background: 'var(--primary)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  textAlign: 'right',
                }}
              >
                <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700 }}>
                  Next
                </span>
                {next.title}
              </span>
              <ChevronRight size={20} style={{ flexShrink: 0 }} />
            </Link>
          ) : (
            <div style={{ flex: 1 }} />
          )}
        </div>
      )}

      {(prev || next) && (
        <p
          className="font-sans text-xs text-muted"
          style={{ margin: 0, textAlign: 'center', opacity: 0.85 }}
        >
          Tip: use ↑↓ or J/K to skip videos
        </p>
      )}
    </div>
  );
}

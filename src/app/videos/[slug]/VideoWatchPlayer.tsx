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
 * Watch player with portrait-friendly sizing, fullscreen-capable Stream iframe,
 * and next/prev (reels-style) nav.
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
      className="video-watch-player"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: portrait ? 'center' : 'stretch',
        gap: '1rem',
        marginBottom: '1.25rem',
        width: '100%',
      }}
    >
      <div
        className={portrait ? 'vw-frame vw-portrait' : 'vw-frame vw-landscape'}
        style={{
          position: 'relative',
          aspectRatio: aspect,
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
          // Fullscreen via allow= only (avoid allowfullscreen attribute conflict warning)
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
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

      {(prev || next) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            gap: '0.65rem',
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          {prev ? (
            <Link
              href={`/videos/${prev.slug}`}
              className="font-sans"
              style={{
                flex: '1 1 140px',
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
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--muted)',
                    fontWeight: 700,
                  }}
                >
                  Previous
                </span>
                {prev.title}
              </span>
            </Link>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }} />
          )}

          {next ? (
            <Link
              href={`/videos/${next.slug}`}
              className="font-sans"
              style={{
                flex: '1 1 140px',
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
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    opacity: 0.85,
                    fontWeight: 700,
                  }}
                >
                  Next
                </span>
                {next.title}
              </span>
              <ChevronRight size={20} style={{ flexShrink: 0 }} />
            </Link>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }} />
          )}
        </div>
      )}

      {(prev || next) && (
        <p
          className="font-sans text-xs text-muted vw-kb-hint"
          style={{ margin: 0, textAlign: 'center', opacity: 0.85 }}
        >
          Tip: use ↑↓ or J/K to skip videos
        </p>
      )}

      <style>{`
        .vw-frame {
          position: relative;
        }
        .vw-portrait {
          width: min(100%, 280px);
          max-height: min(52vh, 420px);
        }
        .vw-landscape {
          width: 100%;
          max-height: min(70vh, 640px);
        }
        @media (max-width: 640px) {
          .vw-portrait {
            /* Mobile: larger — use most of the screen width so it feels native */
            width: min(92vw, 340px);
            max-height: min(62vh, 520px);
          }
          .vw-landscape {
            max-height: min(56vh, 480px);
          }
          .vw-kb-hint {
            display: none;
          }
        }
        @media (min-width: 641px) and (max-width: 900px) {
          .vw-portrait {
            width: min(100%, 260px);
            max-height: min(48vh, 400px);
          }
        }
        @media (min-width: 901px) {
          .vw-portrait {
            /* Desktop: compact so full page is visible */
            width: min(100%, 220px);
            max-height: min(40vh, 360px);
          }
        }
      `}</style>
    </div>
  );
}

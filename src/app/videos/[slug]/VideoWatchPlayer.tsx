'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/ga-client';

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
 * Watch player + prev/next.
 * Mobile: two equal compact chips (Prev | Next) — no long titles overflowing pills.
 * Desktop: titles ellipsized beside the labels.
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
    track('video_start', { video_title: title });
  }, [title]);

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

  const chipBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.2rem',
    minHeight: 48,
    minWidth: 0,
    maxWidth: '100%',
    width: '100%',
    padding: '0.65rem 0.75rem',
    borderRadius: 9999,
    textDecoration: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontWeight: 700,
    fontSize: '0.88rem',
    lineHeight: 1.2,
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div
      className="video-watch-player"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: portrait ? 'center' : 'stretch',
        gap: '0.85rem',
        marginBottom: '1.25rem',
        width: '100%',
        maxWidth: '100%',
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
        <nav
          aria-label="Previous and next video"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '0.5rem',
            width: '100%',
            maxWidth: portrait ? '22rem' : '100%',
            margin: portrait ? '0 auto' : undefined,
            boxSizing: 'border-box',
          }}
        >
          {prev ? (
            <Link
              href={`/videos/${prev.slug}`}
              className="font-sans"
              title={prev.title}
              aria-label={`Previous video: ${prev.title}`}
              style={{
                ...chipBase,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--foreground)',
              }}
            >
              <ChevronLeft size={18} style={{ flexShrink: 0 }} aria-hidden />
              <span style={{ flexShrink: 0 }}>Prev</span>
            </Link>
          ) : (
            <span style={{ minHeight: 48 }} aria-hidden />
          )}

          {next ? (
            <Link
              href={`/videos/${next.slug}`}
              className="font-sans"
              title={next.title}
              aria-label={`Next video: ${next.title}`}
              style={{
                ...chipBase,
                border: '1.5px solid var(--primary)',
                background: 'var(--primary)',
                color: '#fff',
              }}
            >
              <span style={{ flexShrink: 0 }}>Next</span>
              <ChevronRight size={18} style={{ flexShrink: 0 }} aria-hidden />
            </Link>
          ) : (
            <span style={{ minHeight: 48 }} aria-hidden />
          )}
        </nav>
      )}

      {/* Desktop-only: show which videos are next/prev under the chips */}
      {(prev || next) && (
        <div
          className="vw-nav-captions font-sans"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '0.5rem',
            width: '100%',
            maxWidth: portrait ? '22rem' : '100%',
            margin: portrait ? '0 auto' : undefined,
            fontSize: '0.72rem',
            lineHeight: 1.3,
            color: 'var(--muted)',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              paddingLeft: '0.25rem',
            }}
            title={prev?.title}
          >
            {prev?.title || ''}
          </span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              textAlign: 'right',
              paddingRight: '0.25rem',
            }}
            title={next?.title}
          >
            {next?.title || ''}
          </span>
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

        /* Hide long captions under chips on phones — titles stay in title= tooltips */
        @media (max-width: 720px) {
          .vw-nav-captions {
            display: none !important;
          }
          .vw-kb-hint {
            display: none;
          }
          .vw-portrait {
            width: min(92vw, 340px);
            max-height: min(62vh, 520px);
          }
          .vw-landscape {
            max-height: min(56vh, 480px);
          }
        }

        @media (min-width: 721px) and (max-width: 900px) {
          .vw-portrait {
            width: min(100%, 260px);
            max-height: min(48vh, 400px);
          }
        }
        @media (min-width: 901px) {
          .vw-portrait {
            width: min(100%, 220px);
            max-height: min(40vh, 360px);
          }
        }
      `}</style>
    </div>
  );
}

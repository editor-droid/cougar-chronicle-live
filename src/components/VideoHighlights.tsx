'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDurationLabel, videoPagePath } from '@/lib/videos';

export type VideoHighlightItem = {
  id: string;
  slug?: string;
  title: string;
  description?: string | null;
  platform: 'STREAM' | 'YOUTUBE';
  embedUrl: string;
  thumbnailUrl: string | null;
  durationSec?: number | null;
};

type Props = {
  videos: VideoHighlightItem[];
  title?: string;
  /** sidebar | home | page */
  variant?: 'sidebar' | 'home' | 'page';
  showSeeAll?: boolean;
  /**
   * When true (default), cards navigate to /videos/[slug] for shareable URLs + SEO.
   * When false, open an in-page modal player (needs embedUrl only).
   */
  linkToWatchPage?: boolean;
};

export default function VideoHighlights({
  videos,
  title = 'Video highlights',
  variant = 'sidebar',
  showSeeAll = true,
  linkToWatchPage = true,
}: Props) {
  const [active, setActive] = useState<VideoHighlightItem | null>(null);

  const close = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [active, close]);

  if (!videos.length) return null;

  const isSidebar = variant === 'sidebar';
  const isPage = variant === 'page';

  const cardInner = (v: VideoHighlightItem) => {
    const dur = formatDurationLabel(v.durationSec);
    return (
      <>
        <div
          style={{
            position: 'relative',
            width: isSidebar ? 96 : '100%',
            flexShrink: 0,
            aspectRatio: '16/9',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '0.25rem',
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
        >
          {v.thumbnailUrl ? (
            <Image
              src={v.thumbnailUrl}
              alt=""
              fill
              sizes={isSidebar ? '96px' : '(max-width: 768px) 50vw, 220px'}
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--primary)',
                opacity: 0.85,
              }}
            />
          )}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.25)',
            }}
          >
            <span
              style={{
                width: isSidebar ? 28 : 40,
                height: isSidebar ? 28 : 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              <svg width={isSidebar ? 10 : 14} height={isSidebar ? 10 : 14} viewBox="0 0 24 24" fill="var(--primary)">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
          {dur && (
            <span
              className="font-sans"
              style={{
                position: 'absolute',
                right: 4,
                bottom: 4,
                fontSize: '0.65rem',
                fontWeight: 700,
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                padding: '0.1rem 0.3rem',
                borderRadius: '0.15rem',
              }}
            >
              {dur}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            className="font-serif"
            style={{
              fontSize: isSidebar ? '0.95rem' : '1.05rem',
              fontWeight: 700,
              lineHeight: 1.3,
              display: 'block',
            }}
          >
            {v.title}
          </span>
          {!isSidebar && v.description && (
            <span className="font-sans text-xs text-muted" style={{ display: 'block', marginTop: '0.25rem' }}>
              {v.description}
            </span>
          )}
        </div>
      </>
    );
  };

  const cardStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isSidebar ? 'row' : 'column',
    gap: isSidebar ? '0.75rem' : '0.5rem',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'inherit',
    width: '100%',
    textDecoration: 'none',
  };

  return (
    <section
      className="video-highlights"
      style={{ marginBottom: isSidebar ? '2.5rem' : isPage ? 0 : '3rem' }}
      aria-label={title || 'Videos'}
    >
      {(title || (showSeeAll && !isPage)) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '0.75rem',
            borderBottom: isSidebar || !isPage ? '2px solid var(--primary)' : 'none',
            paddingBottom: isSidebar ? '0.5rem' : '0.75rem',
            marginBottom: isSidebar ? '1rem' : '1.25rem',
          }}
        >
          {title ? (
            <h2
              className={isSidebar ? 'font-sans text-xs text-muted' : 'font-serif'}
              style={
                isSidebar
                  ? {
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontSize: '0.75rem',
                      margin: 0,
                      color: 'var(--muted)',
                    }
                  : {
                      fontSize: isPage ? '2rem' : '1.5rem',
                      margin: 0,
                      fontWeight: 800,
                    }
              }
            >
              {isSidebar ? title.toUpperCase() : title}
            </h2>
          ) : (
            <span />
          )}
          {showSeeAll && !isPage && (
            <Link href="/videos" className="font-sans text-xs" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              All videos →
            </Link>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isSidebar
            ? '1fr'
            : isPage
              ? 'repeat(auto-fill, minmax(260px, 1fr))'
              : 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: isSidebar ? '0.85rem' : '1rem',
        }}
      >
        {videos.map((v) => {
          const href = v.slug ? videoPagePath(v.slug) : null;
          const useLink = linkToWatchPage && href;

          if (useLink) {
            return (
              <Link key={v.id} href={href} className="video-highlight-card" style={cardStyle}>
                {cardInner(v)}
              </Link>
            );
          }

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(v)}
              className="video-highlight-card"
              style={cardStyle}
            >
              {cardInner(v)}
            </button>
          );
        })}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(900px, 100%)',
              background: '#000',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.65rem 1rem',
                background: 'var(--primary)',
                color: '#fff',
                gap: '1rem',
              }}
            >
              <span className="font-serif" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                {active.title}
              </span>
              <button
                type="button"
                onClick={close}
                className="font-sans"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: '#fff',
                  borderRadius: '0.25rem',
                  padding: '0.25rem 0.6rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
            <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
              <iframe
                src={`${active.embedUrl}${active.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
                title={active.title}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

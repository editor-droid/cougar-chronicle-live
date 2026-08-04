import Link from 'next/link';
import {
  defaultLinkLabel,
  parseVideoDescription,
  type DescriptionLink,
} from '@/lib/video-description';
import { ExternalLink } from 'lucide-react';

type ResolvedLink = DescriptionLink & { label: string };

export default function VideoDescription({
  text,
  resolvedTitles,
  className,
  style,
  portrait,
}: {
  text: string;
  /** slug → public title for nicer button labels */
  resolvedTitles?: Record<string, string>;
  className?: string;
  style?: React.CSSProperties;
  portrait?: boolean;
}) {
  const { body, links } = parseVideoDescription(text);
  if (!body && links.length === 0) return null;

  const resolved: ResolvedLink[] = links.map((l) => ({
    ...l,
    label: defaultLinkLabel(
      l,
      l.slug && resolvedTitles ? resolvedTitles[l.slug] : null
    ),
  }));

  return (
    <div
      className={`video-desc ${className || ''}`}
      style={{
        ...style,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        alignItems: portrait ? 'center' : 'flex-start',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {body && (
        <div
          className="font-sans video-desc-body"
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.65,
            color: 'var(--foreground)',
            margin: 0,
            width: '100%',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {body}
        </div>
      )}

      {resolved.length > 0 && (
        <div
          className="video-desc-links"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: '100%',
            maxWidth: portrait ? '22rem' : '100%',
            alignItems: 'stretch',
            boxSizing: 'border-box',
          }}
        >
          {resolved.map((link) => {
            const isInternal = link.kind === 'article' || link.kind === 'video';
            const kindClass =
              link.kind === 'article'
                ? 'vd-link-article'
                : link.kind === 'video'
                  ? 'vd-link-video'
                  : 'vd-link-external';

            const inner = (
              <>
                <span className="vd-link-label">{link.label}</span>
                {!isInternal && (
                  <ExternalLink size={14} className="vd-link-ext" aria-hidden />
                )}
              </>
            );

            if (isInternal) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-sans vd-link ${kindClass}`}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-sans vd-link ${kindClass}`}
              >
                {inner}
              </a>
            );
          })}
        </div>
      )}

      <style>{`
        .vd-link {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 0.45rem;
          width: 100%;
          max-width: 100%;
          min-height: 44px;
          padding: 0.7rem 1rem;
          border-radius: 0.65rem;
          font-weight: 700;
          font-size: 0.88rem;
          text-decoration: none;
          line-height: 1.3;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }
        .vd-link-article {
          background: var(--primary);
          color: #fff;
          border: 1px solid var(--primary);
        }
        .vd-link-video {
          background: var(--surface);
          color: var(--primary);
          border: 1.5px solid var(--primary);
        }
        .vd-link-external {
          background: var(--surface);
          color: var(--foreground);
          border: 1px solid var(--border);
        }
        .vd-link-label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-align: left;
        }
        .vd-link-ext {
          flex-shrink: 0;
          opacity: 0.75;
        }

        @media (max-width: 640px) {
          .video-desc {
            align-items: stretch !important;
            text-align: left !important;
          }
          .video-desc-body {
            font-size: 0.95rem !important;
            text-align: left !important;
          }
          .video-desc-links {
            max-width: 100% !important;
          }
          .vd-link {
            min-height: 48px;
            padding: 0.75rem 0.9rem;
            border-radius: 0.75rem;
            font-size: 0.86rem;
          }
          .vd-link-label {
            -webkit-line-clamp: 2;
          }
        }
      `}</style>
    </div>
  );
}

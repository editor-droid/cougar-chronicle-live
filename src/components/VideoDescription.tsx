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
      className={className}
      style={{
        ...style,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: portrait ? 'center' : 'flex-start',
      }}
    >
      {body && (
        <div
          className="font-sans"
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.65,
            color: 'var(--foreground)',
            margin: 0,
            width: '100%',
            whiteSpace: 'pre-wrap',
          }}
        >
          {body}
        </div>
      )}

      {resolved.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            width: '100%',
            maxWidth: portrait ? '22rem' : '28rem',
            alignItems: portrait ? 'center' : 'stretch',
          }}
        >
          {resolved.map((link) => {
            const isInternal = link.kind === 'article' || link.kind === 'video';
            const btnStyle: React.CSSProperties = {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: portrait ? 'center' : 'flex-start',
              gap: '0.5rem',
              padding: '0.75rem 1.15rem',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              lineHeight: 1.3,
              width: portrait ? '100%' : 'auto',
              maxWidth: '100%',
              boxSizing: 'border-box',
              ...(link.kind === 'article'
                ? {
                    background: 'var(--primary)',
                    color: '#fff',
                    border: '1px solid var(--primary)',
                  }
                : link.kind === 'video'
                  ? {
                      background: 'var(--surface)',
                      color: 'var(--primary)',
                      border: '1.5px solid var(--primary)',
                    }
                  : {
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      border: '1px solid var(--border)',
                    }),
            };

            const inner = (
              <>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {link.label}
                </span>
                {!isInternal && (
                  <ExternalLink size={15} style={{ flexShrink: 0, opacity: 0.75 }} />
                )}
              </>
            );

            if (isInternal) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-sans"
                  style={btnStyle}
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
                className="font-sans"
                style={btnStyle}
              >
                {inner}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

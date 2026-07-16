import prisma from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getArticleUrl } from '@/lib/routes';
import { rewriteMediaUrl } from '@/lib/media-url';
import { LINK_HUB_SHOW_LATEST_KEY, linkHubTrackedUrl } from '@/lib/link-hub';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Links',
  description:
    'Official links from The Cougar Chronicle — stories, membership, videos, and more.',
  alternates: { canonical: 'https://thecougarchronicle.com/links' },
  openGraph: {
    title: 'Links | The Cougar Chronicle',
    description: 'Everything Chronicle — in one place.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

export default async function LinksHubPage() {
  const [items, setting, latest] = await Promise.all([
    prisma.linkHubItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.siteSetting.findUnique({ where: { key: LINK_HUB_SHOW_LATEST_KEY } }),
    prisma.post.findFirst({
      where: {
        state: 'PUBLISHED',
        printEditionId: null,
        publishedAt: { lte: new Date() },
      },
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
      include: { author: true },
    }),
  ]);

  const showLatest = setting?.value !== 'false';
  const latestHref = latest
    ? linkHubTrackedUrl(getArticleUrl(latest), {
        campaign: 'latest',
        content: 'top-card',
      })
    : null;
  const latestImage = latest?.imageUrl
    ? rewriteMediaUrl(latest.imageUrl)
    : null;

  return (
    <div
      data-link-hub-page
      style={{
        minHeight: '100dvh',
        padding: '2rem 1rem 3rem',
        display: 'flex',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: '26rem' }}>
        {/* Brand header */}
        <header style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div
              className="font-serif"
              style={{
                color: 'var(--primary)',
                fontSize: '1.75rem',
                lineHeight: 1.1,
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: '0.95rem', fontWeight: 400, display: 'block' }}>
                The
              </span>
              Cougar Chronicle
            </div>
          </Link>
          <p
            className="font-sans text-sm text-muted"
            style={{ margin: '0.65rem 0 0', lineHeight: 1.4 }}
          >
            Faith, Reason, and Politics at BYU
          </p>
        </header>

        {/* Auto latest story */}
        {showLatest && latest && latestHref && (
          <a
            href={latestHref}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              marginBottom: '1.25rem',
              borderRadius: '1rem',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}
          >
            {latestImage && (
              <div style={{ position: 'relative', aspectRatio: '16/9', background: '#eee' }}>
                <Image
                  src={latestImage}
                  alt=""
                  fill
                  sizes="420px"
                  style={{ objectFit: 'cover' }}
                  priority
                />
              </div>
            )}
            <div style={{ padding: '0.9rem 1rem 1rem' }}>
              <span
                className="font-sans text-xs"
                style={{
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                }}
              >
                Latest story
              </span>
              <h2
                className="font-serif"
                style={{
                  fontSize: '1.2rem',
                  margin: '0.35rem 0 0.25rem',
                  lineHeight: 1.25,
                  fontWeight: 700,
                }}
              >
                {latest.title}
              </h2>
              <p className="font-sans text-xs text-muted" style={{ margin: 0 }}>
                {latest.customAuthor || latest.author.name || 'Staff'}
              </p>
            </div>
          </a>
        )}

        {/* Link rows */}
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          {items.map((item) => {
            const href = `/api/link-hub/click?id=${encodeURIComponent(item.id)}`;
            const showImg = item.showImage && item.imageUrl;

            return (
              <li key={item.id}>
                <a
                  href={href}
                  className="font-sans"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    minHeight: '3.25rem',
                    padding: showImg ? '0.5rem 1rem 0.5rem 0.5rem' : '0.85rem 1.1rem',
                    borderRadius: '9999px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  {showImg ? (
                    <span
                      style={{
                        position: 'relative',
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'var(--border)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl!}
                        alt=""
                        width={44}
                        height={44}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </span>
                  ) : item.emoji ? (
                    <span
                      style={{
                        fontSize: '1.25rem',
                        lineHeight: 1,
                        width: '1.5rem',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                      aria-hidden
                    >
                      {item.emoji}
                    </span>
                  ) : null}
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      paddingRight: showImg || item.emoji ? '1.5rem' : 0,
                    }}
                  >
                    {item.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        {items.length === 0 && !showLatest && (
          <p className="font-sans text-muted text-center text-sm">
            Links coming soon.
          </p>
        )}

        {/* Socials */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.15rem',
            marginTop: '1.75rem',
            opacity: 0.85,
          }}
        >
          <SocialIcon
            href={linkHubTrackedUrl('https://twitter.com/TheCougChron', {
              campaign: 'social',
              content: 'x',
            })}
            label="X"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 3.974H5.059z" />
          </SocialIcon>
          <SocialIcon
            href={linkHubTrackedUrl('https://www.instagram.com/thecougchron/', {
              campaign: 'social',
              content: 'ig',
            })}
            label="Instagram"
          >
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </SocialIcon>
          <SocialIcon
            href={linkHubTrackedUrl('https://www.youtube.com/@TheCougChron', {
              campaign: 'social',
              content: 'yt',
            })}
            label="YouTube"
          >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </SocialIcon>
        </div>

        <p
          className="font-sans text-xs text-muted"
          style={{ textAlign: 'center', marginTop: '2rem' }}
        >
          <Link href="/" style={{ color: 'inherit' }}>
            thecougarchronicle.com
          </Link>
        </p>
      </div>
    </div>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{ color: 'var(--primary)' }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        {children}
      </svg>
    </a>
  );
}

import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  buildVideoBreadcrumbJsonLd,
  buildVideoObjectJsonLd,
  fetchStreamDetails,
  formatDurationLabel,
  isPortraitVideo,
  resolveStreamEmbedUrl,
  resolveStreamThumbnailUrl,
  streamContentUrl,
  videoAspectRatioCss,
  videoPageUrl,
} from '@/lib/videos';
import VideoHighlights from '@/components/VideoHighlights';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const video = await prisma.video.findFirst({
    where: { slug, isActive: true },
  });

  if (!video) {
    return { title: 'Video not found' };
  }

  const description =
    video.description ||
    `${video.title} — video from The Cougar Chronicle.`;
  const pageTitle = video.seoTitle || video.title;
  const url = videoPageUrl(video.slug);
  const thumb = resolveStreamThumbnailUrl(video);
  const embed = resolveStreamEmbedUrl(video);
  const ogImages = thumb
    ? [{ url: thumb, width: 1280, height: 720, alt: video.title }]
    : [{ url: '/default-og.png', width: 1200, height: 630 }];
  const keywords = video.seoKeywords
    ? video.seoKeywords.split(',').map((k) => k.trim()).filter(Boolean)
    : undefined;

  return {
    title: `${pageTitle} | Videos`,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${pageTitle} | Videos | The Cougar Chronicle`,
      description,
      url,
      type: 'video.other',
      siteName: 'The Cougar Chronicle',
      images: ogImages,
      videos: embed
        ? [
            {
              url: embed,
              type: 'text/html',
              width: 1280,
              height: 720,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pageTitle} | Videos | The Cougar Chronicle`,
      description,
      images: thumb ? [thumb] : ['/default-og.png'],
    },
  };
}

export default async function VideoWatchPage({ params }: Props) {
  const { slug } = await params;
  let video = await prisma.video.findFirst({
    where: { slug, isActive: true },
  });

  if (!video) notFound();

  // Enrich dimensions / duration from Stream when missing
  if (video.platform === 'STREAM' && video.externalId) {
    const needsMeta =
      video.width == null ||
      video.height == null ||
      video.durationSec == null ||
      !video.thumbnailUrl;
    if (needsMeta) {
      const meta = await fetchStreamDetails(video.externalId);
      if (meta) {
        video = await prisma.video.update({
          where: { id: video.id },
          data: {
            ...(meta.width != null ? { width: meta.width } : {}),
            ...(meta.height != null ? { height: meta.height } : {}),
            ...(meta.durationSec != null && video.durationSec == null
              ? { durationSec: meta.durationSec }
              : {}),
            ...(meta.thumbnailUrl && !video.thumbnailUrl
              ? { thumbnailUrl: meta.thumbnailUrl }
              : {}),
          },
        });
      }
    }
  }

  // Page view (same simple model as articles)
  await prisma.video.update({
    where: { id: video.id },
    data: { views: { increment: 1 } },
  });
  video = { ...video, views: video.views + 1 };

  const moreVideos = await prisma.video.findMany({
    where: { isActive: true, id: { not: video.id } },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    take: 6,
  });

  const pageUrl = videoPageUrl(video.slug);
  const portrait = isPortraitVideo(video.width, video.height);
  const embedUrl = resolveStreamEmbedUrl(video, {
    letterboxColor: 'transparent',
    primaryColor: '#1b2253',
    preload: 'metadata',
  });
  const thumbnailUrl = resolveStreamThumbnailUrl(video);
  const contentUrl =
    video.platform === 'STREAM' && video.externalId
      ? streamContentUrl(video.externalId)
      : video.contentUrl;
  const jsonLd = buildVideoObjectJsonLd(
    { ...video, embedUrl, thumbnailUrl, contentUrl },
    pageUrl
  );
  const breadcrumbLd = buildVideoBreadcrumbJsonLd(video);
  const durationLabel = formatDurationLabel(video.durationSec);
  const aspect = videoAspectRatioCss(video.width, video.height);

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c'),
        }}
      />

      <nav
        className="font-sans text-sm text-muted"
        aria-label="Breadcrumb"
        style={{ marginBottom: '1.25rem' }}
      >
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
            alignItems: 'center',
          }}
        >
          <li>
            <Link href="/" style={{ fontWeight: 600 }}>
              Home
            </Link>
          </li>
          <li aria-hidden style={{ opacity: 0.5 }}>
            /
          </li>
          <li>
            <Link href="/videos" style={{ fontWeight: 600 }}>
              Videos
            </Link>
          </li>
          <li aria-hidden style={{ opacity: 0.5 }}>
            /
          </li>
          <li style={{ color: 'var(--foreground)', fontWeight: 600 }} aria-current="page">
            {video.title}
          </li>
        </ol>
      </nav>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: portrait ? '1fr' : 'minmax(0, 1fr) minmax(260px, 320px)',
          gap: '2.5rem',
          alignItems: 'start',
        }}
        className="video-watch-layout"
      >
        <article style={{ minWidth: 0 }}>
          <header style={{ marginBottom: '1.25rem', textAlign: portrait ? 'center' : 'left' }}>
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                margin: '0 0 0.5rem',
                fontWeight: 800,
                lineHeight: 1.2,
              }}
            >
              {video.title}
            </h1>
            <div
              className="font-sans text-sm text-muted"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'center',
                justifyContent: portrait ? 'center' : 'flex-start',
              }}
            >
              <time dateTime={video.publishedAt.toISOString()}>
                {video.publishedAt.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {durationLabel && <span>· {durationLabel}</span>}
              <span>· {video.views.toLocaleString()} views</span>
            </div>
          </header>

          {/* Player: portrait = centered phone frame; landscape = full column */}
          <div
            style={{
              display: 'flex',
              justifyContent: portrait ? 'center' : 'stretch',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: portrait ? 'min(100%, 420px)' : '100%',
                aspectRatio: aspect,
                maxHeight: portrait ? 'min(85vh, 780px)' : undefined,
                backgroundColor: portrait ? 'transparent' : 'var(--surface-hover)',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: portrait
                  ? '0 12px 40px rgba(0,0,0,0.12)'
                  : '0 4px 20px rgba(0,0,0,0.06)',
              }}
            >
              <iframe
                src={embedUrl}
                title={video.title}
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
          </div>

          {video.description && (
            <p
              className="font-sans"
              style={{
                fontSize: '1.05rem',
                lineHeight: 1.65,
                color: 'var(--foreground)',
                margin: '0 0 0.5rem',
                maxWidth: portrait ? '36rem' : '40rem',
                marginLeft: portrait ? 'auto' : undefined,
                marginRight: portrait ? 'auto' : undefined,
                textAlign: portrait ? 'center' : 'left',
              }}
            >
              {video.description}
            </p>
          )}

          {thumbnailUrl && (
            <div style={{ display: 'none' }} aria-hidden>
              <Image src={thumbnailUrl} alt={video.title} width={1280} height={720} unoptimized />
            </div>
          )}

          {/* On portrait / mobile: more videos below player */}
          {moreVideos.length > 0 && (
            <div
              className="video-more-mobile"
              style={{
                marginTop: '2.5rem',
                borderTop: '2px solid var(--border)',
                paddingTop: '1.5rem',
              }}
            >
              <VideoHighlights
                videos={moreVideos.map((v) => ({
                  id: v.id,
                  slug: v.slug,
                  title: v.title,
                  description: v.description,
                  platform: v.platform,
                  embedUrl: resolveStreamEmbedUrl(v),
                  thumbnailUrl: resolveStreamThumbnailUrl(v),
                  durationSec: v.durationSec,
                }))}
                title="More videos"
                variant="home"
                showSeeAll
                linkToWatchPage
              />
            </div>
          )}
        </article>

        {/* Desktop sidebar for landscape layouts */}
        {moreVideos.length > 0 && !portrait && (
          <aside className="video-watch-sidebar" style={{ position: 'sticky', top: '1.25rem' }}>
            <VideoHighlights
              videos={moreVideos.map((v) => ({
                id: v.id,
                slug: v.slug,
                title: v.title,
                description: v.description,
                platform: v.platform,
                embedUrl: resolveStreamEmbedUrl(v),
                thumbnailUrl: resolveStreamThumbnailUrl(v),
                durationSec: v.durationSec,
              }))}
              title="More videos"
              variant="sidebar"
              showSeeAll
              linkToWatchPage
            />
          </aside>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .video-watch-layout {
            grid-template-columns: 1fr !important;
          }
          .video-watch-sidebar {
            display: none !important;
          }
        }
        @media (min-width: 901px) {
          .video-more-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

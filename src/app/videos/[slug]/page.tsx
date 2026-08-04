import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
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
import FavoriteButton from '@/components/FavoriteButton';
import ShareButton from '@/components/ShareButton';
import VideoDescription from '@/components/VideoDescription';
import { parseVideoDescription } from '@/lib/video-description';
import VideoWatchPlayer from './VideoWatchPlayer';

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

  // Full playlist order for next/prev (newest first, matches library)
  const playlist = await prisma.video.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    select: { id: true, slug: true, title: true },
  });
  const idx = playlist.findIndex((v) => v.id === video.id);
  const prevVideo = idx > 0 ? playlist[idx - 1] : null;
  const nextVideo = idx >= 0 && idx < playlist.length - 1 ? playlist[idx + 1] : null;

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

  const session = await auth();
  let initialFavorited = false;
  if (session?.user?.id) {
    const fav = await prisma.videoFavorite.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId: video.id,
        },
      },
      select: { id: true },
    });
    initialFavorited = Boolean(fav);
  }

  // Resolve article/video titles for nice “Read: …” buttons
  const parsedDesc = parseVideoDescription(video.description);
  const resolvedTitles: Record<string, string> = {};
  const articleSlugs = parsedDesc.links
    .filter((l) => l.kind === 'article' && l.slug)
    .map((l) => l.slug!);
  const videoSlugs = parsedDesc.links
    .filter((l) => l.kind === 'video' && l.slug)
    .map((l) => l.slug!);
  if (articleSlugs.length) {
    const posts = await prisma.post.findMany({
      where: { slug: { in: articleSlugs }, state: 'PUBLISHED' },
      select: { slug: true, title: true },
    });
    for (const p of posts) resolvedTitles[p.slug] = p.title;
  }
  if (videoSlugs.length) {
    const vids = await prisma.video.findMany({
      where: { slug: { in: videoSlugs }, isActive: true },
      select: { slug: true, title: true },
    });
    for (const v of vids) resolvedTitles[v.slug] = v.title;
  }

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
        className="font-sans text-sm text-muted video-watch-crumb"
        aria-label="Breadcrumb"
        style={{ marginBottom: '1rem' }}
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
          <li aria-hidden className="video-watch-crumb-tail" style={{ opacity: 0.5 }}>
            /
          </li>
          <li
            className="video-watch-crumb-tail"
            style={{ color: 'var(--foreground)', fontWeight: 600 }}
            aria-current="page"
          >
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
        <article style={{ minWidth: 0, width: '100%' }}>
          <header
            className="video-watch-header"
            style={{
              marginBottom: '1.15rem',
              textAlign: portrait ? 'center' : 'left',
            }}
          >
            <h1
              className="font-serif"
              style={{
                fontSize: 'clamp(1.45rem, 4.5vw, 2.5rem)',
                margin: '0 0 0.65rem',
                fontWeight: 800,
                lineHeight: 1.2,
                overflowWrap: 'anywhere',
              }}
            >
              {video.title}
            </h1>
            <div
              className="font-sans text-sm text-muted video-watch-meta"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem 0.75rem',
                alignItems: 'center',
                justifyContent: portrait ? 'center' : 'flex-start',
              }}
            >
              <span
                className="video-watch-actions"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <FavoriteButton
                  videoId={video.id}
                  initialFavorited={initialFavorited}
                />
                <ShareButton
                  title={video.title}
                  text={`${video.title} — The Cougar Chronicle`}
                  url={pageUrl}
                  campaign="video"
                />
              </span>
              <span className="video-watch-meta-sep" aria-hidden>
                ·
              </span>
              <time dateTime={video.publishedAt.toISOString()}>
                {video.publishedAt.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
              {durationLabel && (
                <>
                  <span className="video-watch-meta-sep" aria-hidden>
                    ·
                  </span>
                  <span>{durationLabel}</span>
                </>
              )}
              <span className="video-watch-meta-sep" aria-hidden>
                ·
              </span>
              <span>{video.views.toLocaleString()} views</span>
            </div>
          </header>

          <VideoWatchPlayer
            title={video.title}
            embedUrl={embedUrl}
            portrait={portrait}
            aspect={aspect}
            prev={prevVideo ? { slug: prevVideo.slug, title: prevVideo.title } : null}
            next={nextVideo ? { slug: nextVideo.slug, title: nextVideo.title } : null}
          />

          {video.description && (
            <VideoDescription
              text={video.description}
              resolvedTitles={resolvedTitles}
              portrait={portrait}
              style={{
                margin: '0 0 0.5rem',
                maxWidth: portrait ? '36rem' : '40rem',
                marginLeft: portrait ? 'auto' : undefined,
                marginRight: portrait ? 'auto' : undefined,
                textAlign: portrait ? 'center' : 'left',
              }}
            />
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
            gap: 1.5rem !important;
          }
          .video-watch-sidebar {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .video-watch-header {
            text-align: left !important;
          }
          .video-watch-meta {
            justify-content: flex-start !important;
            font-size: 0.8rem;
            row-gap: 0.35rem;
          }
          .video-watch-actions {
            width: 100%;
            margin-bottom: 0.15rem;
          }
          .video-watch-actions button,
          .video-watch-actions > * {
            min-height: 40px;
            min-width: 40px;
          }
          .video-watch-crumb-tail {
            display: none !important;
          }
          .video-more-mobile {
            margin-top: 1.75rem !important;
            padding-top: 1.25rem !important;
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

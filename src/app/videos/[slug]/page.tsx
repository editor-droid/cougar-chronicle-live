import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  buildVideoBreadcrumbJsonLd,
  buildVideoObjectJsonLd,
  formatDurationLabel,
  resolveStreamEmbedUrl,
  resolveStreamThumbnailUrl,
  streamContentUrl,
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
    title: `${pageTitle} | Videos | The Cougar Chronicle`,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: pageTitle,
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
      title: pageTitle,
      description,
      images: thumb ? [thumb] : ['/default-og.png'],
    },
  };
}

export default async function VideoWatchPage({ params }: Props) {
  const { slug } = await params;
  const video = await prisma.video.findFirst({
    where: { slug, isActive: true },
  });

  if (!video) notFound();

  const moreVideos = await prisma.video.findMany({
    where: { isActive: true, id: { not: video.id } },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    take: 4,
  });

  const pageUrl = videoPageUrl(video.slug);
  const embedUrl = resolveStreamEmbedUrl(video);
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
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
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

      <article style={{ maxWidth: '900px' }}>
        <header style={{ marginBottom: '1.25rem' }}>
          <h1
            className="font-serif"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', margin: '0 0 0.5rem', fontWeight: 800, lineHeight: 1.2 }}
          >
            {video.title}
          </h1>
          <div
            className="font-sans text-sm text-muted"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}
          >
            <time dateTime={video.publishedAt.toISOString()}>
              {video.publishedAt.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            {durationLabel && <span>· {durationLabel}</span>}
            <span>· {video.platform === 'STREAM' ? 'Chronicle video' : 'YouTube'}</span>
          </div>
        </header>

        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            backgroundColor: '#000',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            marginBottom: '1.5rem',
          }}
        >
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            loading="eager"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>

        {video.description && (
          <p
            className="font-sans"
            style={{ fontSize: '1.05rem', lineHeight: 1.65, color: 'var(--foreground)', margin: '0 0 2rem', maxWidth: '40rem' }}
          >
            {video.description}
          </p>
        )}

        {thumbnailUrl && (
          <div style={{ display: 'none' }} aria-hidden>
            <Image src={thumbnailUrl} alt={video.title} width={1280} height={720} unoptimized />
          </div>
        )}
      </article>

      {moreVideos.length > 0 && (
        <div style={{ marginTop: '3rem', borderTop: '2px solid var(--border)', paddingTop: '2rem' }}>
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
    </div>
  );
}

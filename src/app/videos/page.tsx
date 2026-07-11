import prisma from '@/lib/prisma';
import type { Metadata } from 'next';
import VideoHighlights from '@/components/VideoHighlights';
import { buildVideoObjectJsonLd } from '@/lib/videos';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Videos | The Cougar Chronicle',
  description:
    'Interviews, campus moments, and short features from The Cougar Chronicle newsroom.',
  openGraph: {
    title: 'Videos | The Cougar Chronicle',
    description: 'Interviews, campus moments, and short features from our newsroom.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Videos | The Cougar Chronicle',
    description: 'Interviews, campus moments, and short features from our newsroom.',
    images: ['/default-og.png'],
  },
  alternates: {
    canonical: 'https://thecougarchronicle.com/videos',
  },
};

export default async function VideosPage() {
  const videos = await prisma.video.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    take: 48,
  });

  const jsonLdList = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Videos',
    description: 'Interviews, campus moments, and short features from our newsroom.',
    url: 'https://thecougarchronicle.com/videos',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: videos.map((v, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://thecougarchronicle.com/videos/${v.slug}`,
        item: buildVideoObjectJsonLd(v, `https://thecougarchronicle.com/videos/${v.slug}`),
      })),
    },
  };

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', marginBottom: '4rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdList).replace(/</g, '\\u003c'),
        }}
      />

      <header style={{ marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1.5rem' }}>
        <h1 className="font-serif" style={{ fontSize: '3.5rem', margin: 0 }}>
          Videos
        </h1>
        <p
          className="font-sans"
          style={{
            fontSize: '1.25rem',
            maxWidth: '36rem',
            color: 'var(--muted)',
            margin: '1rem 0 0',
            lineHeight: 1.55,
          }}
        >
          Interviews, campus moments, and short features from our newsroom.
        </p>
      </header>

      {videos.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--surface)',
          }}
        >
          <p className="font-serif" style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>
            Nothing here yet
          </p>
          <p className="font-sans text-muted text-sm" style={{ marginBottom: '1.25rem' }}>
            New clips will appear as we publish them.
          </p>
          <Link href="/" className="btn btn-primary font-sans text-sm">
            Read the latest
          </Link>
        </div>
      ) : (
        <VideoHighlights
          videos={videos.map((v) => ({
            id: v.id,
            slug: v.slug,
            title: v.title,
            description: v.description,
            platform: v.platform,
            embedUrl: v.embedUrl,
            thumbnailUrl: v.thumbnailUrl,
            durationSec: v.durationSec,
          }))}
          title=""
          variant="page"
          showSeeAll={false}
          linkToWatchPage
        />
      )}
    </div>
  );
}

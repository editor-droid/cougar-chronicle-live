import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getArticleUrl } from '@/lib/routes';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getSectionLabel } from '@/lib/sections';
import { rewriteMediaUrl } from '@/lib/media-url';

export const metadata: Metadata = {
  title: 'Opinion',
  description:
    'Op-eds and opinion from The Cougar Chronicle — across News, Politics, Faith, Family, and more.',
  keywords: [
    'BYU conservative opinion',
    'LDS student perspectives',
    'op-ed',
    'Campus culture',
    'Faith-based political commentary',
  ],
  alternates: { canonical: 'https://thecougarchronicle.com/opinion' },
  openGraph: {
    title: 'Opinion | The Cougar Chronicle',
    description:
      'Op-eds and opinion from The Cougar Chronicle across every section.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
};

export default async function OpinionArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const resolved = await searchParams;
  const currentPage = parseInt(resolved.page || '1', 10);
  const sortOrder = resolved.sort === 'oldest' ? 'asc' : 'desc';
  const postsPerPage = 18;
  const skip = (currentPage - 1) * postsPerPage;

  const where = {
    format: 'opinion',
    state: 'PUBLISHED' as const,
    publishedAt: { lte: new Date() },
  };

  const [posts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: sortOrder },
      include: { author: true },
      take: postsPerPage,
      skip,
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.ceil(totalPosts / postsPerPage) || 1;

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '3rem',
          borderBottom: '2px solid var(--border)',
          paddingBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 className="font-serif" style={{ fontSize: '3.5rem', margin: 0 }}>
            Opinion
          </h1>
          <p className="font-sans text-muted" style={{ margin: '0.5rem 0 0' }}>
            Op-eds across every section of The Cougar Chronicle.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="font-sans text-sm text-muted">Sort by:</span>
          <Link
            href="/opinion?sort=newest"
            className="font-sans text-sm"
            style={{
              fontWeight: sortOrder === 'desc' ? 'bold' : 'normal',
              color: sortOrder === 'desc' ? 'var(--primary)' : 'var(--foreground)',
              textDecoration: sortOrder === 'desc' ? 'underline' : 'none',
            }}
          >
            Newest
          </Link>
          <span className="text-muted">|</span>
          <Link
            href="/opinion?sort=oldest"
            className="font-sans text-sm"
            style={{
              fontWeight: sortOrder === 'asc' ? 'bold' : 'normal',
              color: sortOrder === 'asc' ? 'var(--primary)' : 'var(--foreground)',
              textDecoration: sortOrder === 'asc' ? 'underline' : 'none',
            }}
          >
            Oldest
          </Link>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-muted font-sans">
          No opinion pieces published yet. (Run section migration, then re-check.)
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '2rem',
          }}
        >
          {posts.map((post) => (
            <Link
              key={post.id}
              href={getArticleUrl(post)}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <article
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  background: 'var(--surface)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {post.imageUrl && (
                  <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                    <Image
                      src={rewriteMediaUrl(post.imageUrl)}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div style={{ padding: '1.25rem', flex: 1 }}>
                  <span
                    className="font-sans text-xs"
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                      color: 'var(--primary)',
                    }}
                  >
                    {getSectionLabel(post.category)} · Opinion
                  </span>
                  <h2
                    className="font-serif"
                    style={{ fontSize: '1.35rem', margin: '0.5rem 0', lineHeight: 1.25 }}
                  >
                    {post.title}
                  </h2>
                  <p className="font-sans text-sm text-muted" style={{ margin: 0 }}>
                    {post.customAuthor || post.author.name} ·{' '}
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            marginTop: '3rem',
          }}
        >
          {currentPage > 1 && (
            <Link
              href={`/opinion?page=${currentPage - 1}&sort=${resolved.sort || 'newest'}`}
              className="btn btn-secondary font-sans"
            >
              Previous
            </Link>
          )}
          <span className="font-sans text-sm text-muted" style={{ alignSelf: 'center' }}>
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/opinion?page=${currentPage + 1}&sort=${resolved.sort || 'newest'}`}
              className="btn btn-secondary font-sans"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

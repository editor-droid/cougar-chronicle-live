import Link from 'next/link';
import Image from 'next/image';
import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';
import {
  getSection,
  getSectionPath,
  postsWhereForPublicHub,
  type PublicSectionSlug,
} from '@/lib/categories';
import { buildSectionJsonLd } from '@/lib/section-seo';
import { rewriteMediaUrl } from '@/lib/media-url';
import { notFound } from 'next/navigation';

const POSTS_PER_PAGE = 18;

export default async function SectionListing({
  slug,
  searchParams,
}: {
  slug: PublicSectionSlug;
  searchParams: { page?: string; sort?: string };
}) {
  const section = getSection(slug);
  if (!section) notFound();

  const currentPage = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const sortOrder = searchParams.sort === 'oldest' ? 'asc' : 'desc';
  const skip = (currentPage - 1) * POSTS_PER_PAGE;
  const basePath = getSectionPath(slug);

  // News/Opinion = format aggregates; Campus/Politics/Family/Faith = topic category
  const hubWhere = postsWhereForPublicHub(slug);
  const publishedWhere = {
    ...hubWhere,
    state: 'PUBLISHED' as const,
    publishedAt: { lte: new Date() },
  };

  const [posts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: publishedWhere,
      orderBy: { publishedAt: sortOrder },
      include: { author: true },
      take: POSTS_PER_PAGE,
      skip,
    }),
    prisma.post.count({
      where: publishedWhere,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
  const jsonLd = buildSectionJsonLd(slug, posts, { page: currentPage });

  const sortQs = (sort: 'newest' | 'oldest') =>
    sort === 'oldest' ? `${basePath}?sort=oldest` : basePath;
  const pageQs = (page: number) => {
    const params = new URLSearchParams();
    if (sortOrder === 'asc') params.set('sort', 'oldest');
    if (page > 1) params.set('page', String(page));
    const q = params.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="font-sans" style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
          <li>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li style={{ color: 'var(--foreground)', fontWeight: 600 }}>{section.label}</li>
        </ol>
      </nav>

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '2.5rem',
          borderBottom: '2px solid var(--border)',
          paddingBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ maxWidth: '40rem' }}>
          <h1 className="font-serif" style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', margin: 0, lineHeight: 1.1 }}>
            {section.label}
          </h1>
          <p className="font-sans text-muted" style={{ margin: '0.65rem 0 0', fontSize: '1rem', lineHeight: 1.55 }}>
            {section.description}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="font-sans text-sm text-muted">Sort:</span>
          <Link
            href={sortQs('newest')}
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
            href={sortQs('oldest')}
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
      </header>

      {posts.length === 0 ? (
        <p className="text-center text-muted font-sans">No articles published in this section yet.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '2.5rem',
          }}
        >
          {posts.map((post, index) => {
            const href = getArticleUrl(post);
            const img = rewriteMediaUrl(post.imageUrl);
            return (
              <article key={post.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <Link
                  href={href}
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/9',
                    backgroundColor: 'var(--surface-hover)',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    display: 'block',
                    overflow: 'hidden',
                  }}
                >
                  {img ? (
                    <Image
                      src={img}
                      alt={post.featuredImageAlt || post.title}
                      fill
                      priority={index < 3}
                      sizes="(max-width: 768px) 100vw, 450px"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : null}
                </Link>
                <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', lineHeight: '1.3', fontWeight: 700 }}>
                  <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {post.title}
                  </Link>
                </h2>
                <div
                  className="text-muted text-sm font-sans"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
                >
                  <span>
                    By {post.customAuthor || post.author.name} &bull;{' '}
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {post.printEditionId ? (
                    <span
                      style={{
                        fontSize: '0.6rem',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        backgroundColor: 'var(--surface-hover)',
                        padding: '0.1rem 0.3rem',
                        borderRadius: '0.25rem',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                      }}
                    >
                      Print
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '4rem', flexWrap: 'wrap' }}
        >
          {currentPage > 1 ? (
            <Link href={pageQs(currentPage - 1)} className="btn font-sans" style={{ border: '1px solid var(--border)' }} rel="prev">
              &larr; Previous
            </Link>
          ) : (
            <span className="btn font-sans" style={{ opacity: 0.5, cursor: 'not-allowed', border: '1px solid var(--border)' }}>
              &larr; Previous
            </span>
          )}
          <span className="font-sans" style={{ display: 'flex', alignItems: 'center', margin: '0 0.5rem' }}>
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link href={pageQs(currentPage + 1)} className="btn font-sans" style={{ border: '1px solid var(--border)' }} rel="next">
              Next &rarr;
            </Link>
          ) : (
            <span className="btn font-sans" style={{ opacity: 0.5, cursor: 'not-allowed', border: '1px solid var(--border)' }}>
              Next &rarr;
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

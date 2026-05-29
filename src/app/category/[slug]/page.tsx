import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getArticleUrl } from '@/lib/routes';
import Image from 'next/image';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1);
  
  let keywords: string[] = [];
  if (slug === 'news') {
    keywords = ['BYU campus news', 'Independent BYU news', 'Conservative student journalism', 'Brigham Young University events', 'Utah university news', 'BYU student reporting'];
  } else if (slug === 'opinion') {
    keywords = ['BYU conservative opinion', 'LDS student perspectives', 'Traditional values on campus', 'Brigham Young University student voices', 'Faith-based political commentary', 'Campus culture wars'];
  } else if (slug === 'faith') {
    keywords = ['BYU faith articles', 'Latter-day Saint student news', 'LDS perspectives', 'Defending the faith on campus', 'Brigham Young University religious news', 'Gospel-centered news'];
  }

  return {
    title: categoryName,
    description: `Browse all articles filed under ${categoryName} in The Cougar Chronicle.`,
    keywords
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ page?: string, sort?: string }> }) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10);
  const sortOrder = resolvedSearchParams.sort === 'oldest' ? 'asc' : 'desc';
  const postsPerPage = 18;
  const skip = (currentPage - 1) * postsPerPage;
  
  const [posts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: { category: slug, state: 'PUBLISHED' },
      orderBy: { publishedAt: sortOrder },
      include: { author: true },
      take: postsPerPage,
      skip: skip,
    }),
    prisma.post.count({
      where: { category: slug, state: 'PUBLISHED' }
    })
  ]);
  
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1);
  const headerFontClass = 'font-serif';

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className={headerFontClass} style={{ fontSize: '3.5rem', margin: 0 }}>
          {categoryName}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="font-sans text-sm text-muted">Sort by:</span>
          <Link href={`/category/${slug}?sort=newest`} className="font-sans text-sm" style={{ fontWeight: sortOrder === 'desc' ? 'bold' : 'normal', color: sortOrder === 'desc' ? 'var(--primary)' : 'var(--foreground)', textDecoration: sortOrder === 'desc' ? 'underline' : 'none' }}>Newest</Link>
          <span className="text-muted">|</span>
          <Link href={`/category/${slug}?sort=oldest`} className="font-sans text-sm" style={{ fontWeight: sortOrder === 'asc' ? 'bold' : 'normal', color: sortOrder === 'asc' ? 'var(--primary)' : 'var(--foreground)', textDecoration: sortOrder === 'asc' ? 'underline' : 'none' }}>Oldest</Link>
        </div>
      </div>
      
      {posts.length === 0 ? (
        <p className="text-center text-muted font-sans">No articles published in this category yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2.5rem' }}>
          {posts.map((post) => (
            <article key={post.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <Link href={getArticleUrl(post)} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: 'var(--surface-hover)', borderRadius: '0.5rem', marginBottom: '1rem', display: 'block', overflow: 'hidden' }}>
                {post.imageUrl && (
                  <Image src={post.imageUrl} alt={post.title} fill sizes="(max-width: 768px) 100vw, 300px" style={{ objectFit: 'cover' }} />
                )}
              </Link>
              <h3 className={headerFontClass} style={{ fontSize: '1.5rem', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                <Link href={getArticleUrl(post)}>{post.title}</Link>
              </h3>
              <div className="text-muted text-sm font-sans" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>By {post.author.name} &bull; {new Date(post.createdAt).toLocaleDateString()}</span>
                {post.printEditionId && <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>🗞️ Print</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '4rem' }}>
          {currentPage > 1 ? (
            <Link href={`/category/${slug}?page=${currentPage - 1}`} className="btn font-sans" style={{ border: '1px solid var(--border)' }}>
              &larr; Previous Page
            </Link>
          ) : (
            <span className="btn font-sans" style={{ opacity: 0.5, cursor: 'not-allowed', border: '1px solid var(--border)' }}>
              &larr; Previous Page
            </span>
          )}
          
          <span className="font-sans" style={{ display: 'flex', alignItems: 'center', margin: '0 1rem' }}>
            Page {currentPage} of {totalPages}
          </span>
          
          {currentPage < totalPages ? (
            <Link href={`/category/${slug}?page=${currentPage + 1}`} className="btn font-sans" style={{ border: '1px solid var(--border)' }}>
              Next Page &rarr;
            </Link>
          ) : (
            <span className="btn font-sans" style={{ opacity: 0.5, cursor: 'not-allowed', border: '1px solid var(--border)' }}>
              Next Page &rarr;
            </span>
          )}
        </div>
      )}
    </div>
  );
}

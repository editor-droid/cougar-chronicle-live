import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getArticleUrl } from '@/lib/routes';
import Image from 'next/image';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'America 250',
    description: 'A collection of op-eds and commentary from The Cougar Chronicle marking America’s 250th anniversary. Reflections on the founding, liberty, faith, and the American experiment.',
    keywords: ['America 250', 'American founding', 'US Semiquincentennial', 'BYU opinion', 'conservative commentary', 'liberty', 'Constitution']
  };
}

export default async function America250Page({ searchParams }: { searchParams: Promise<{ page?: string, sort?: string }> }) {
  const resolvedSearchParams = await searchParams;
  
  const currentPage = parseInt(resolvedSearchParams.page || '1', 10);
  const sortOrder = resolvedSearchParams.sort === 'oldest' ? 'asc' : 'desc';
  const postsPerPage = 18;
  const skip = (currentPage - 1) * postsPerPage;
  
  const [posts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: { 
        isAmerica250: true,
        state: 'PUBLISHED', 
        publishedAt: { lte: new Date() } 
      },
      orderBy: { publishedAt: sortOrder },
      include: { author: true },
      take: postsPerPage,
      skip: skip,
    }),
    prisma.post.count({
      where: { 
        isAmerica250: true,
        state: 'PUBLISHED', 
        publishedAt: { lte: new Date() } 
      }
    })
  ]);
  
  // Excitement builder mode until July 4, 2026
  const now = new Date();
  const revealDate = new Date('2026-07-04');
  const isRevealed = now >= revealDate;
  const displayPosts = isRevealed ? posts : [];
  const displayTotalPosts = isRevealed ? totalPosts : 0;
  const totalPages = Math.ceil(displayTotalPosts / postsPerPage);

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      {/* Static American Flag Banner (looks like a flag waving in the wind) */}
      <div 
        style={{ 
          color: 'white', 
          padding: '3rem 2rem', 
          borderRadius: '0.75rem', 
          marginBottom: '3rem',
          border: '1px solid #3a4a5c',
          position: 'relative',
          overflow: 'hidden',
          // American flag look with subtle fabric/fold effect to suggest movement
          background: `
            repeating-linear-gradient(
              to bottom,
              #B22234 0%, #B22234 7.5%,
              #FFFFFF 7.5%, #FFFFFF 15%,
              #B22234 15%, #B22234 22.5%,
              #FFFFFF 22.5%, #FFFFFF 30%,
              #B22234 30%, #B22234 37.5%,
              #FFFFFF 37.5%, #FFFFFF 45%,
              #B22234 45%, #B22234 52.5%,
              #FFFFFF 52.5%, #FFFFFF 60%,
              #B22234 60%, #B22234 67.5%,
              #FFFFFF 67.5%, #FFFFFF 75%,
              #B22234 75%, #B22234 82.5%,
              #FFFFFF 82.5%, #FFFFFF 90%,
              #B22234 90%, #B22234 100%
            )
          `
        }}
      >
        {/* Blue canton */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '40%',
          height: '53%',
          backgroundColor: '#3C3B6E',
          zIndex: 1,
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)'
        }} />

        {/* Subtle fabric folds / wind texture so it looks like a real flag (static) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 20%, rgba(0,0,0,0.22) 50%, transparent 85%),
            linear-gradient(to right, rgba(255,255,255,0.07) 0%, transparent 35%)
          `,
          zIndex: 2,
          pointerEvents: 'none'
        }} />

        {/* Dark overlay for text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(15,25,50,0.72) 0%, rgba(25,40,70,0.58) 100%)',
          zIndex: 3,
          borderRadius: '0.75rem'
        }} />

        <div style={{ position: 'relative', zIndex: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🇺🇸</span>
            <h1 className="font-serif" style={{ fontSize: '3rem', margin: 0, color: 'white' }}>
              America 250
            </h1>
          </div>
          <p className="font-sans" style={{ fontSize: '1.1rem', maxWidth: '720px', opacity: 0.95, marginBottom: '0.5rem' }}>
            In 2026, the United States marks its 250th anniversary. This collection gathers op-eds, essays, and commentary 
            from The Cougar Chronicle exploring the American founding, the principles of liberty, the role of faith in 
            a free society, and what it means to “stand for something” in our time.
          </p>
          {!isRevealed && (
            <p className="font-sans text-sm" style={{ opacity: 0.9, marginTop: '0.5rem' }}>
              🇺🇸 Series launches July 4, 2026 — powerful new voices on what America stands for.
            </p>
          )}
        </div>
      </div>

      {displayPosts.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="font-serif" style={{ fontSize: '1.75rem', margin: 0 }}>
            Essays &amp; Commentary
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="font-sans text-sm text-muted">Sort by:</span>
            <Link href={`/america-250?sort=newest`} className="font-sans text-sm" style={{ fontWeight: sortOrder === 'desc' ? 'bold' : 'normal', color: sortOrder === 'desc' ? 'var(--primary)' : 'var(--foreground)', textDecoration: sortOrder === 'desc' ? 'underline' : 'none' }}>Newest</Link>
            <span className="text-muted">|</span>
            <Link href={`/america-250?sort=oldest`} className="font-sans text-sm" style={{ fontWeight: sortOrder === 'asc' ? 'bold' : 'normal', color: sortOrder === 'asc' ? 'var(--primary)' : 'var(--foreground)', textDecoration: sortOrder === 'asc' ? 'underline' : 'none' }}>Oldest</Link>
          </div>
        </div>
      )}
      
      {displayPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          {!isRevealed ? (
            <>
              <p className="text-muted font-sans" style={{ fontSize: '1.1rem' }}>The America 250 series launches July 4, 2026.</p>
              <p className="text-sm text-muted font-sans mt-2">Powerful op-eds from student writers on the founding, liberty, exceptionalism, and what America has made possible. Get ready.</p>
            </>
          ) : (
            <>
              <p className="text-muted font-sans">No America 250 articles published yet.</p>
              <p className="text-sm text-muted font-sans mt-2">Check back soon as more pieces from the series are added.</p>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2.5rem' }}>
          {displayPosts.map((post, index) => (
            <article key={post.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <Link href={getArticleUrl(post)} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: 'var(--surface-hover)', borderRadius: '0.5rem', marginBottom: '1rem', display: 'block', overflow: 'hidden' }}>
                {post.imageUrl && (
                  <Image src={post.imageUrl} alt={post.title} fill priority={index < 3} sizes="(max-width: 768px) 100vw, 450px" style={{ objectFit: 'cover' }} />
                )}
              </Link>
              <h3 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                <Link href={getArticleUrl(post)}>{post.title}</Link>
              </h3>
              <div className="text-muted text-sm font-sans" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>By {post.customAuthor || post.author.name} &bull; {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
                {post.printEditionId && <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>🗞️ Print</span>}
                {post.category && <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', background: 'var(--surface-hover)', padding: '0.05rem 0.35rem', borderRadius: '2px' }}>{post.category}</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && displayPosts.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '4rem' }}>
          {currentPage > 1 ? (
            <Link href={`/america-250?page=${currentPage - 1}${sortOrder === 'asc' ? '&sort=oldest' : ''}`} className="btn font-sans" style={{ border: '1px solid var(--border)' }}>
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
            <Link href={`/america-250?page=${currentPage + 1}${sortOrder === 'asc' ? '&sort=oldest' : ''}`} className="btn font-sans" style={{ border: '1px solid var(--border)' }}>
              Next Page &rarr;
            </Link>
          ) : (
            <span className="btn font-sans" style={{ opacity: 0.5, cursor: 'not-allowed', border: '1px solid var(--border)' }}>
              Next Page &rarr;
            </span>
          )}
        </div>
      )}

      <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', fontSize: '0.9rem' }} className="font-sans text-muted">
        <p>Have a perspective on America’s 250th? <Link href="/contact" style={{ color: 'var(--primary)' }}>Pitch an op-ed</Link> or reach out to the editors.</p>
      </div>
    </div>
  );
}

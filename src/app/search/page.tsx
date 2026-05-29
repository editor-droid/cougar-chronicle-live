import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getArticleUrl } from '@/lib/routes';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Results',
  description: 'Search for articles in The Cougar Chronicle.',
  keywords: [
    'Search BYU conservative news',
    'Find The Cougar Chronicle articles',
    'Daily Universe alternative',
    'Turning Point USA BYU'
  ],
  robots: {
    index: false,
    follow: false,
  }
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string, page?: string }> }) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';
  
  const currentPage = parseInt(resolvedParams.page || '1', 10);
  const postsPerPage = 18;
  const skip = (currentPage - 1) * postsPerPage;
  
  let posts: any[] = [];
  let totalPosts = 0;
  
  if (query.trim()) {
    const whereClause = { 
      state: 'PUBLISHED',
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } }
      ]
    } as any;

    const [fetchedPosts, count] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: { author: true },
        take: postsPerPage,
        skip: skip,
      }),
      prisma.post.count({ where: whereClause })
    ]);
    
    posts = fetchedPosts;
    totalPosts = count;
  }

  const totalPages = Math.ceil(totalPosts / postsPerPage);

  const headerFontClass = 'font-serif';

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
        <h1 className="font-serif" style={{ fontSize: '3.5rem', margin: 0 }}>
          Search Results
        </h1>
      </div>
      
      {query ? (
        <p className="font-sans text-muted" style={{ marginBottom: '3rem', fontSize: '1.25rem' }}>
          Found {totalPosts} {totalPosts === 1 ? 'result' : 'results'} for <strong>"{query}"</strong>
        </p>
      ) : (
        <p className="font-sans text-muted" style={{ marginBottom: '3rem', fontSize: '1.25rem' }}>
          Enter a search term to find articles.
        </p>
      )}
      
      {posts.length === 0 && query ? (
        <div className="text-center font-sans" style={{ padding: '3rem 0' }}>
          <p className="text-muted mb-4">We couldn't find any articles matching your search.</p>
          <Link href="/" className="btn btn-primary">Return Home</Link>
        </div>
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
                {post.isPremium && <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--primary)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', border: '1px solid var(--primary)', color: 'white' }}>💎 Premium</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '4rem' }}>
          {currentPage > 1 ? (
            <Link href={`/search?q=${encodeURIComponent(query)}&page=${currentPage - 1}`} className="btn font-sans" style={{ border: '1px solid var(--border)' }}>
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
            <Link href={`/search?q=${encodeURIComponent(query)}&page=${currentPage + 1}`} className="btn font-sans" style={{ border: '1px solid var(--border)' }}>
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

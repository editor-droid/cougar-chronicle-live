import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getArticleUrl } from '@/lib/routes';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Results',
  description: 'Search for articles in The Cougar Chronicle.',
  robots: {
    index: false,
    follow: false,
  }
};

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q || '';
  
  let posts: any[] = [];
  
  if (query.trim()) {
    posts = await prisma.post.findMany({
      where: { 
        state: 'PUBLISHED',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: { author: true },
      take: 50 // Limit results
    });
  }

  const headerFontClass = 'font-serif';

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <h1 className={`${headerFontClass} text-center`} style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Search Results
      </h1>
      
      {query ? (
        <p className="text-center font-sans text-muted" style={{ marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
          Found {posts.length} {posts.length === 1 ? 'result' : 'results'} for <strong>"{query}"</strong>
        </p>
      ) : (
        <p className="text-center font-sans text-muted" style={{ marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
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
    </div>
  );
}

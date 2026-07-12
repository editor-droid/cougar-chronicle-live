import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getArticleUrl } from '@/lib/routes';
import type { Metadata, ResolvingMetadata } from 'next';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    return {
      title: 'Author Not Found',
    };
  }

  return {
    title: `${user.name || 'Author'} | The Cougar Chronicle`,
    description: `Read all articles written by ${user.name || 'Author'} on The Cougar Chronicle.`,
    openGraph: {
      title: `${user.name || 'Author'} | The Cougar Chronicle`,
      description: `Read all articles written by ${user.name || 'Author'} on The Cougar Chronicle.`,
      images: [{ url: '/default-og.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${user.name || 'Author'} | The Cougar Chronicle`,
      description: `Read all articles written by ${user.name || 'Author'} on The Cougar Chronicle.`,
      images: ['/default-og.png'],
    },
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const author = await prisma.user.findUnique({
    where: { id },
    include: {
      posts: {
        where: { state: 'PUBLISHED', publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
      }
    }
  });

  if (!author) {
    notFound();
  }

  const posts = author.posts;

  return (
    <div className="container" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
        {author.image ? (
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1.5rem auto', border: '2px solid var(--border)' }}>
            <Image 
              src={author.image} 
              alt={author.name || 'Author'} 
              width={100} 
              height={100} 
              priority
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '2rem', color: 'var(--muted)' }}>✍️</span>
          </div>
        )}
        <h1 className="font-serif" style={{ fontSize: '3rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>
          {author.name || 'Staff Writer'}
        </h1>
        <p className="font-sans text-muted" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Author at The Cougar Chronicle
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-serif)' }}>{posts.length}</span>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Articles</span>
          </div>
        </div>
      </header>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '3rem' }}>
        <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Latest from {author.name?.split(' ')[0] || 'this author'}</h2>
        
        {posts.length === 0 ? (
          <p className="text-muted">No published articles found for this author.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {posts.map((post) => (
              <article key={post.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                {post.imageUrl && (
                  <Link href={getArticleUrl(post)} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', display: 'block' }}>
                    <Image
                      src={post.imageUrl}
                      alt={post.featuredImageAlt || post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  </Link>
                )}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)' }}>{post.category}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem', lineHeight: 1.3, fontWeight: 'bold' }}>
                    <Link href={getArticleUrl(post)} style={{ textDecoration: 'none', color: 'var(--foreground)' }}>{post.title}</Link>
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                    {post.seoDescription || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 120) + '...' : '')}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

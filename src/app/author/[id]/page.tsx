import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getArticleUrl } from '@/lib/routes';
import type { Metadata, ResolvingMetadata } from 'next';

export async function generateMetadata(
  { params }: { params: { id: string } },
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
  };
}

export default async function AuthorPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const author = await prisma.user.findUnique({
    where: { id },
    include: {
      posts: {
        where: { state: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
      }
    }
  });

  if (!author) {
    notFound();
  }

  const posts = author.posts;

  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
        {author.image ? (
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1.5rem auto', border: '2px solid var(--border)' }}>
            <Image 
              src={author.image} 
              alt={author.name || 'Author'} 
              width={100} 
              height={100} 
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
          <div className="article-grid">
            {posts.map((post) => (
              <article key={post.id} className="article-card">
                {post.imageUrl && (
                  <Link href={getArticleUrl(post)} className="article-image-container">
                    <Image
                      src={post.imageUrl}
                      alt={post.featuredImageAlt || post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  </Link>
                )}
                <div className="article-content">
                  <div className="article-meta">
                    <span className="category">{post.category}</span>
                    <span className="date">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="article-title">
                    <Link href={getArticleUrl(post)}>{post.title}</Link>
                  </h3>
                  <p className="article-excerpt">
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

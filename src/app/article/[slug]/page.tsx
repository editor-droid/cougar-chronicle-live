import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata, ResolvingMetadata } from 'next';

export async function generateMetadata({ params }: { params: { slug: string } }, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  
  const post = await prisma.post.findUnique({
    where: { slug, state: 'PUBLISHED' },
    include: { author: true }
  });

  if (!post) {
    return { title: 'Not Found' };
  }

  const excerpt = post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 160) + '...' : 'Read our latest article.';
  
  return {
    title: post.title,
    description: excerpt,
    openGraph: {
      title: post.title,
      description: excerpt,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      authors: [post.author.name || 'The Cougar Chronicle'],
      images: post.imageUrl ? [post.imageUrl] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: excerpt,
      images: post.imageUrl ? [post.imageUrl] : undefined,
    }
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  
  const post = await prisma.post.findUnique({
    where: { slug, state: 'PUBLISHED' },
    include: { author: true }
  });

  if (!post) {
    notFound();
  }

  // Increment view count asynchronously
  prisma.post.update({
    where: { id: post.id },
    data: { views: { increment: 1 } }
  }).catch(console.error);

  const titleFontClass = 'font-serif';

  return (
    <article className="container animate-fade-in" style={{ maxWidth: '800px', marginTop: '2rem' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <span className="font-sans" style={{ textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.875rem' }}>
          {post.category}
        </span>
        <h1 className={titleFontClass} style={{ fontSize: '3.5rem', marginTop: '1rem', marginBottom: '1.5rem', lineHeight: 1.1 }}>
          {post.title}
        </h1>
        <div className="author-meta text-muted font-sans text-sm" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1rem 0' }}>
          By <strong>{post.author.name}</strong> &bull; Published {new Date(post.createdAt).toLocaleDateString()}
        </div>
      </header>

      {/* Image Rendering */}
      {post.imageUrl ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', marginBottom: '2.5rem', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
          <Image 
            src={post.imageUrl} 
            alt={post.title} 
            fill 
            priority
            sizes="(max-width: 800px) 100vw, 800px"
            style={{ objectFit: 'cover' }} 
          />
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', marginBottom: '2.5rem', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: 'var(--surface-hover)', display: 'none' }} />
      )}

      {/* Rich Text Content */}
      <div 
        className="article-content font-serif" 
        style={{ fontSize: '1.25rem', lineHeight: '1.8', color: 'var(--foreground)' }}
        dangerouslySetInnerHTML={{ __html: post.content || '' }} 
      />
    </article>
  );
}

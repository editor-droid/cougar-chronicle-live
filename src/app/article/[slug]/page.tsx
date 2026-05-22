import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata, ResolvingMetadata } from 'next';
import { auth } from '@/auth';

export async function generateMetadata(
  { params }: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  
  const post = await prisma.post.findUnique({
    where: { slug, state: 'PUBLISHED' },
    include: { author: true }
  });

  if (!post) {
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.',
    };
  }

  // Use the AI-generated SEO fields if they exist, otherwise fallback
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || 
    (post.content 
      ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 155) + '...' 
      : 'Read this article on The Cougar Chronicle.');
      
  const keywords = post.seoKeywords ? post.seoKeywords.split(',').map(k => k.trim()) : [];

  return {
    title: title,
    description: description,
    keywords: keywords,
    openGraph: {
      title: title,
      description: description,
      type: 'article',
      url: `/article/${post.slug}`,
      images: post.imageUrl ? [post.imageUrl] : [],
      publishedTime: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      authors: [post.author.name || 'The Cougar Chronicle'],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: post.imageUrl ? [post.imageUrl] : [],
    }
  };
}

export default async function ArticlePage({ params, searchParams }: { params: { slug: string }, searchParams: { token?: string } }) {
  const { slug } = await params;
  const { token } = await searchParams;
  
  const post = await prisma.post.findUnique({
    where: { slug, state: 'PUBLISHED' },
    include: { author: true }
  });

  if (!post) {
    notFound();
  }

  // Analytics: Increment views
  await prisma.post.update({
    where: { id: post.id },
    data: { views: { increment: 1 } }
  });

  // Check access for premium articles
  let hasAccess = !post.isPremium;
  
  if (post.isPremium) {
    const session = await auth();
    // 1. Check if user is logged in and subscribed
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (user?.isSubscribed || user?.role === 'ADMIN' || user?.role === 'EDITOR' || post.authorId === user?.id) {
        hasAccess = true;
      }
    }
    
    // 2. Check if they have a valid magic token from buying the article individually
    if (!hasAccess && token) {
      const validToken = await prisma.articleToken.findUnique({
        where: { token }
      });
      if (validToken && validToken.postId === post.id) {
        hasAccess = true;
      }
    }
  }

  return (
    <article style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto', minHeight: '100vh' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span className="font-sans text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            {post.category}
          </span>
        </div>
        
        <h1 className="font-serif" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: '1.5rem', color: 'var(--foreground)' }}>
          {post.title}
        </h1>
        
        <div className="font-sans text-sm text-muted" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontWeight: 600 }}>By {post.author.name || 'Staff'}</span>
          <span>•</span>
          <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span>•</span>
          <span>{post.views} views</span>
        </div>
      </header>

      {post.imageUrl && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', marginBottom: '2.5rem', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
          <Image 
            src={post.imageUrl} 
            alt={post.featuredImageAlt || post.title} 
            fill 
            priority
            sizes="(max-width: 800px) 100vw, 800px"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}

      {hasAccess ? (
        <div 
          className="font-serif article-content" 
          style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--foreground)' }}
          dangerouslySetInnerHTML={{ __html: post.content || '' }} 
        />
      ) : (
        <>
          <div 
            className="font-serif article-content" 
            style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--foreground)', position: 'relative' }}
          >
            <div dangerouslySetInnerHTML={{ __html: (post.content || '').substring(0, 500) + '...' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(to bottom, transparent, var(--background))' }}></div>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '3rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', textAlign: 'center' }}>
            <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>This article is for subscribers only.</h2>
            <p className="font-sans text-muted" style={{ marginBottom: '2rem' }}>You can purchase lifetime access to this individual article, or subscribe for unlimited access.</p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <form action="/api/stripe/checkout" method="POST">
                <input type="hidden" name="type" value="digital_article" />
                <input type="hidden" name="name" value={post.title} />
                <input type="hidden" name="metadata" value={JSON.stringify({ postId: post.id, slug: post.slug })} />
                <button type="submit" className="btn btn-secondary font-sans" style={{ fontWeight: 600 }}>
                  Buy Article for $1.99
                </button>
              </form>
              <a href="/subscribe" className="btn btn-primary font-sans" style={{ fontWeight: 600 }}>
                Subscribe Now
              </a>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

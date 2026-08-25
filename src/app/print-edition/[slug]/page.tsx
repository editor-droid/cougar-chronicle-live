import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import type { Metadata, ResolvingMetadata } from 'next';
import { auth } from '@/auth';
import { cookies } from 'next/headers';
import Link from 'next/link';
import ClientLightbox from './ClientLightbox';
import ArticleByline from '@/components/ArticleByline';
import ArticleBody from '@/components/ArticleBody';
import KeyTakeaways from '@/components/KeyTakeaways';
import ShareButton from '@/components/ShareButton';
import RelatedStories from '@/components/RelatedStories';
import { getRelatedPosts } from '@/lib/related';
import { injectHeadingIds } from '@/lib/toc';
import { enhanceArticleVideoEmbeds } from '@/lib/embed-utils';
import { rewriteMediaUrl } from '@/lib/media-url';
import { getArticleUrl } from '@/lib/routes';
import { buildArticleMetadata } from '@/lib/article-metadata';
import { schemaAuthors } from '@/lib/bylines';
import SubscribeForm from '@/components/SubscribeForm';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug, state: 'PUBLISHED' },
    include: { author: true },
  });

  if (!post) {
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.',
    };
  }

  return buildArticleMetadata(post);
}

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ token?: string }> }) {
  const { slug } = await params;
  const { token } = await searchParams;
  
  const post = await prisma.post.findUnique({
    where: { slug, state: 'PUBLISHED' },
    include: { author: true }
  });

  if (!post) {
    notFound();
  }

  if (!post.printEditionId) {
    redirect(getArticleUrl(post));
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
      const memberOk =
        user?.isSubscribed &&
        (!user.membershipExpiresAt || user.membershipExpiresAt > new Date());
      if (memberOk || user?.role === 'ADMIN' || user?.role === 'EDITOR' || post.authorId === user?.id) {
        hasAccess = true;
      }
    }
    
    // 2. Check if they have a valid magic token from buying the article individually
    if (!hasAccess) {
      const cookieStore = await cookies();
      const cookieToken = cookieStore.get(`article_token_${post.id}`)?.value;
      const tokenToCheck = cookieToken || token;

      if (tokenToCheck) {
        const validToken = await prisma.articleToken.findUnique({
          where: { token: tokenToCheck }
        });
        if (validToken && validToken.postId === post.id) {
          hasAccess = true;
        }
      }
    }
  }

  const allEditionPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', printEditionId: post.printEditionId },
    orderBy: [
      { printEditionOrder: 'asc' },
      { createdAt: 'asc' }
    ],
    select: { id: true, title: true, slug: true, imageUrl: true, category: true, printEditionId: true }
  });

  const currentIndex = allEditionPosts.findIndex(p => p.id === post.id);
  const prevPost = currentIndex > 0 ? allEditionPosts[currentIndex - 1] : null;
  const nextPost = currentIndex >= 0 && currentIndex < allEditionPosts.length - 1 ? allEditionPosts[currentIndex + 1] : null;

  const topPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', id: { not: post.id } },
    orderBy: { views: 'desc' },
    take: 5
  });

  const relatedPosts = await getRelatedPosts(post, 3);

  const htmlContent = post.content
    ? enhanceArticleVideoEmbeds(injectHeadingIds(post.content))
    : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    image: post.imageUrl ? [post.imageUrl] : [],
    datePublished: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: schemaAuthors(post.customAuthor || post.author.name || 'Staff'),
    publisher: {
      '@type': 'Organization',
      name: 'The Cougar Chronicle',
      logo: {
        '@type': 'ImageObject',
        url: 'https://thecougarchronicle.com/icon.png'
      }
    }
  };

  return (
    <div className="article-page-layout">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ClientLightbox />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <article style={{ padding: '0', minHeight: '60vh' }}>
          <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <span className="font-sans text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  {post.category}
                </span>
                {post.printEditionId && (
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    🗞️ Print Edition
                  </span>
                )}
              </div>
            </div>
            
            <h1 className="font-serif" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: '1.5rem', color: 'var(--foreground)' }}>
              {post.title}
            </h1>
            
            <div className="font-sans text-sm text-muted" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <ArticleByline
                authorId={post.authorId}
                authorName={post.author.name}
                customAuthor={post.customAuthor}
              />
              <ShareButton title={post.title} text={`${post.title} — The Cougar Chronicle`} />
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

          <KeyTakeaways content={post.keyInsights || ''} />

          {hasAccess ? (
            <ArticleBody
              className="font-serif article-content"
              style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--foreground)' }}
              html={htmlContent}
            />
          ) : (
            <>
              <div
                className="font-serif article-content"
                style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--foreground)', position: 'relative' }}
              >
                <div dangerouslySetInnerHTML={{ __html: htmlContent.substring(0, 500) + '...' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '150px', background: 'linear-gradient(to bottom, transparent, var(--background))' }}></div>
              </div>
              
              <div style={{ marginTop: '2rem', padding: '3rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', textAlign: 'center' }}>
                <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>This article is exclusive to the Print Edition.</h2>
                <p className="font-sans text-muted" style={{ marginBottom: '2rem' }}>Purchase lifetime digital access to read this individual article.</p>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <form action="/api/stripe/checkout" method="POST">
                    <input type="hidden" name="type" value="digital_article" />
                    <input type="hidden" name="name" value={post.title} />
                    <input type="hidden" name="metadata" value={JSON.stringify({ postId: post.id, slug: post.slug })} />
                    <button type="submit" className="btn font-sans" style={{ fontWeight: 600, backgroundColor: 'var(--primary)', color: 'white', border: '1px solid var(--primary)' }}>
                      Buy Article for $1.99
                    </button>
                  </form>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <a href="/restore-purchases" className="font-sans text-sm text-muted" style={{ textDecoration: 'underline' }}>Already bought this? Restore your purchase link.</a>
                </div>
              </div>
            </>
          )}
        </article>

        <RelatedStories posts={relatedPosts} />

        {/* Next and Previous Navigation */}
        <nav className="article-nav" aria-label="Article navigation">
          {prevPost ? (
            <Link href={getArticleUrl(prevPost)} className="article-nav-card article-nav-card--prev">
              {prevPost.imageUrl && (
                <Image
                  src={rewriteMediaUrl(prevPost.imageUrl)}
                  alt=""
                  width={80}
                  height={80}
                  className="article-nav-card__thumb"
                />
              )}
              <div className="article-nav-card__body">
                <span className="article-nav-card__label">Previous Article</span>
                <p className="article-nav-card__title">{prevPost.title}</p>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextPost ? (
            <Link href={getArticleUrl(nextPost)} className="article-nav-card article-nav-card--next">
              <div className="article-nav-card__body">
                <span className="article-nav-card__label">Next Article</span>
                <p className="article-nav-card__title">{nextPost.title}</p>
              </div>
              {nextPost.imageUrl && (
                <Image
                  src={rewriteMediaUrl(nextPost.imageUrl)}
                  alt=""
                  width={80}
                  height={80}
                  className="article-nav-card__thumb"
                />
              )}
            </Link>
          ) : (
            <div />
          )}
        </nav>

        {/* Bottom Newsletter Signup */}
        <div className="newsletter-box" style={{ marginTop: '3rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 className="font-serif" style={{ color: 'white', fontSize: '1.75rem', margin: '0 0 0.5rem 0' }}>The Cougar Chronicle</h2>
          <p className="font-sans text-sm" style={{ marginBottom: '1.5rem', opacity: 0.9 }}>Get the best conservative journalism delivered to your inbox daily.</p>
          <SubscribeForm />
        </div>
      </div>

      {/* Sidebar */}
      <aside className="article-sidebar">
        <h2 className="widget-title">Most Read</h2>
        <ol className="trending-list-dense">
          {topPosts.map((tp, i) => (
            <li key={tp.id}>
              <span className="rank">{i + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="font-sans text-xs" style={{ color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{tp.category}</span>
                  {tp.printEditionId && (
                    <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>🗞️ Print</span>
                  )}
                </div>
                <Link href={getArticleUrl(tp)} className="font-serif" style={{ fontSize: '1.1rem', lineHeight: 1.3, fontWeight: 600 }}>
                  {tp.title}
                </Link>
              </div>
            </li>
          ))}
        </ol>

        <div className="newsletter-box" style={{ marginTop: '3rem', borderRadius: '0.5rem' }}>
          <h3 className="font-serif" style={{ color: 'white' }}>The Cougar Chronicle</h3>
          <p className="font-sans text-sm" style={{ marginBottom: '1.5rem', opacity: 0.9 }}>Get the best conservative journalism delivered to your inbox daily.</p>
          <SubscribeForm />
        </div>
      </aside>
    </div>
  );
}

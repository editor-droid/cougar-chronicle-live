import Image from 'next/image';
import Link from 'next/link';
import ArticleByline from '@/components/ArticleByline';
import ArticleDonateBlocks from '@/components/ArticleDonateBlocks';
import KeyTakeaways from '@/components/KeyTakeaways';
import RelatedStories from '@/components/RelatedStories';
import SubscribeForm from '@/components/SubscribeForm';
import VideoHighlights from '@/components/VideoHighlights';
import { categoryLabel, formatLabel, getSectionPath } from '@/lib/categories';
import { isBreakingStillActive } from '@/lib/breaking';
import { getArticleUrl } from '@/lib/routes';
import { rewriteMediaUrl } from '@/lib/media-url';

type PreviewPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
  format: string;
  imageUrl: string | null;
  imageCaption: string | null;
  featuredImageAlt: string | null;
  keyInsights: string | null;
  customAuthor: string | null;
  authorId: string;
  isPremium: boolean;
  isAmerica250: boolean;
  isBreaking: boolean;
  breakingUntil: Date | null;
  showDonateCta: boolean;
  printEditionId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  state: string;
  author: { name: string | null; slug: string | null } | null;
};

type Neighbor = {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  isPremium: boolean;
  printEditionId: string | null;
};

type Related = {
  id: string;
  title: string;
  slug: string;
  category: string;
  imageUrl: string | null;
  isPremium: boolean;
  isAmerica250: boolean;
  printEditionId: string | null;
  customAuthor: string | null;
  publishedAt: Date | null;
  author: { name: string | null };
};

type SidebarVideo = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  platform: 'STREAM' | 'YOUTUBE';
  embedUrl: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
};

/**
 * The public article layout, used for staff preview links.
 * Callers must not mount a view beacon or print a view count.
 */
export default function ArticleDocument({
  post,
  html,
  expiresAt,
  relatedPosts,
  topPosts,
  sidebarVideos,
  prevPost,
  nextPost,
}: {
  post: PreviewPost;
  html: string;
  expiresAt: Date;
  relatedPosts: Related[];
  topPosts: Array<Related & { category: string }>;
  sidebarVideos: SidebarVideo[];
  prevPost: Neighbor | null;
  nextPost: Neighbor | null;
}) {
  const sectionPath = post.category ? getSectionPath(post.category) : '/news';
  const sectionLabel = post.category ? categoryLabel(post.category) : 'News';
  const expiresLabel = expiresAt.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="article-page-layout">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <p
          role="note"
          className="font-sans text-sm"
          style={{
            margin: '0 0 1.25rem',
            padding: '0.75rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            background: 'var(--surface)',
            color: 'var(--foreground)',
          }}
        >
          Draft preview. This page is not indexed and does not count a view.
          {post.state === 'PUBLISHED' ? ' The live story is separate from this link.' : ''} Link expires {expiresLabel}.
        </p>
        <article style={{ padding: '0', minHeight: '60vh' }}>
          <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <Link
                  href={sectionPath}
                  className="font-sans text-xs text-muted"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, textDecoration: 'none' }}
                >
                  {sectionLabel}
                </Link>
                {post.format === 'opinion' && (
                  <Link
                    href="/opinion"
                    className="font-sans text-xs"
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                      textDecoration: 'none',
                      color: 'var(--primary)',
                      border: '1px solid var(--border)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '0.25rem',
                    }}
                  >
                    {formatLabel(post.format)}
                  </Link>
                )}
                {post.printEditionId && (
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    Print Edition
                  </span>
                )}
                {post.isAmerica250 && (
                  <Link href="/america-250" style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--primary)', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', textDecoration: 'none' }}>
                    America 250
                  </Link>
                )}
                {isBreakingStillActive(post) && (
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, backgroundColor: '#b91c1c', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', letterSpacing: '0.06em' }}>
                    Breaking
                  </span>
                )}
              </div>
            </div>

            <h1 className="font-serif article-headline">{post.title}</h1>

            <div className="font-sans text-sm text-muted" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <ArticleByline
                authorId={post.authorId}
                authorName={post.author?.name}
                customAuthor={post.customAuthor}
                authorSlug={post.author?.slug}
              />
              <span>•</span>
              <span>
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </header>

          {post.imageUrl && (
            <figure style={{ marginBottom: '2.5rem', width: '100%' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
                <Image
                  src={rewriteMediaUrl(post.imageUrl)}
                  alt={post.featuredImageAlt || post.title}
                  fill
                  priority
                  sizes="(max-width: 800px) 100vw, 800px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              {post.imageCaption && (
                <figcaption className="font-sans text-xs text-muted" style={{ marginTop: '0.5rem', fontStyle: 'italic', textAlign: 'right' }}>
                  {post.imageCaption}
                </figcaption>
              )}
            </figure>
          )}

          <KeyTakeaways content={post.keyInsights || ''} />

          <ArticleDonateBlocks
            className="font-serif article-content"
            style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--foreground)' }}
            html={html}
            articleSlug={post.slug}
            showDonate={post.showDonateCta !== false}
          />
        </article>

        <RelatedStories posts={relatedPosts} />

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

        <div className="newsletter-box" style={{ marginTop: '3rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 className="font-serif" style={{ color: 'white', fontSize: '1.75rem', margin: '0 0 0.5rem 0' }}>The Cougar Chronicle</h2>
          <p className="font-sans text-sm" style={{ marginBottom: '1.5rem', opacity: 0.9 }}>Get the best conservative journalism delivered to your inbox daily.</p>
          <SubscribeForm />
        </div>
      </div>

      <aside className="article-sidebar">
        <h2 className="widget-title">Most Read</h2>
        <ol className="trending-list-dense">
          {topPosts.map((story, index) => (
            <li key={story.id}>
              <span className="rank">{index + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span className="font-sans text-xs" style={{ color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {story.category}
                </span>
                <Link href={getArticleUrl(story)} className="font-serif" style={{ fontSize: '1.1rem', lineHeight: 1.3, fontWeight: 600 }}>
                  {story.title}
                </Link>
              </div>
            </li>
          ))}
        </ol>

        {sidebarVideos.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <VideoHighlights videos={sidebarVideos} title="Videos" variant="sidebar" linkToWatchPage />
          </div>
        )}

        <div className="newsletter-box" style={{ marginTop: '3rem', borderRadius: '0.5rem' }}>
          <h2 className="font-serif" style={{ color: 'white', fontSize: '1.25rem', margin: '0 0 0.5rem 0' }}>The Cougar Chronicle</h2>
          <p className="font-sans text-sm" style={{ marginBottom: '1.5rem', opacity: 0.9 }}>Get the best conservative journalism delivered to your inbox daily.</p>
          <SubscribeForm />
        </div>
      </aside>
    </div>
  );
}

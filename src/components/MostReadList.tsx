import Link from 'next/link';
import { getArticleUrl } from '@/lib/routes';
import { getMostReadPosts, type MostReadPost, type MostReadQuery } from '@/lib/most-read-query';
import { mostReadHeading, type MostReadWindow } from '@/lib/most-read';

export type MostReadResult = {
  posts: MostReadPost[];
  window: MostReadWindow;
};

type Props = MostReadQuery & {
  variant: 'home' | 'sidebar';
  /** Already loaded in the page's Promise.all. Skips a second read. */
  result?: MostReadResult;
};

function heading(window: MostReadWindow, variant: Props['variant']): string {
  return mostReadHeading(window, variant);
}

/**
 * Sidebar and homepage trending. Uses the rolling daily list, and the
 * all-time Post.views order when the last day and week are still too thin.
 */
export default async function MostReadList({ variant, result, ...query }: Props) {
  const { posts, window } = result ?? (await getMostReadPosts(query));
  if (posts.length === 0) return null;

  const title = heading(window, variant);
  const list = (
    <ol className="trending-list-dense">
      {posts.map((post, index) => (
        <li key={post.id}>
          {variant === 'home' ? (
            <span className="rank font-serif">{index + 1}</span>
          ) : (
            <span className="rank">{index + 1}</span>
          )}
          {variant === 'home' ? (
            <div>
              <Link
                href={getArticleUrl(post)}
                className="font-serif"
                style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', display: 'block', lineHeight: 1.3 }}
              >
                {post.title}
              </Link>
              <span className="font-sans text-xs text-muted" style={{ marginTop: '0.25rem', display: 'block' }}>
                {post.category} {post.printEditionId && '🗞️ Print'} &bull; {post.periodViews} views
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="font-sans text-xs" style={{ color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {post.category}
                </span>
                {post.printEditionId && (
                  <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    🗞️ Print
                  </span>
                )}
              </div>
              <Link href={getArticleUrl(post)} className="font-serif" style={{ fontSize: '1.1rem', lineHeight: 1.3, fontWeight: 600 }}>
                {post.title}
              </Link>
            </div>
          )}
        </li>
      ))}
    </ol>
  );

  if (variant === 'home') {
    return (
      <div style={{ marginBottom: '3rem' }}>
        <h2
          className="font-sans text-xs text-muted"
          style={{
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            borderBottom: '2px solid var(--primary)',
            paddingBottom: '0.5rem',
            fontSize: '0.75rem',
            margin: 0,
          }}
        >
          {title}
        </h2>
        {list}
      </div>
    );
  }

  return (
    <>
      <h2 className="widget-title">{title}</h2>
      {list}
    </>
  );
}

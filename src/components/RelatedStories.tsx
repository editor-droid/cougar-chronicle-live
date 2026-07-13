import Link from 'next/link';
import Image from 'next/image';
import { getArticleUrl } from '@/lib/routes';

type RelatedPost = {
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

export default function RelatedStories({ posts }: { posts: RelatedPost[] }) {
  if (!posts.length) return null;

  return (
    <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
      <h2
        className="font-serif"
        style={{ fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--primary)' }}
      >
        More on this
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {posts.map((p) => {
          const href = getArticleUrl(p);
          return (
            <Link
              key={p.id}
              href={href}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                background: 'var(--surface)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {p.imageUrl && (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                  <Image
                    src={p.imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 100vw, 240px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              )}
              <div style={{ padding: '0.85rem 1rem 1rem' }}>
                <span
                  className="font-sans text-xs"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--primary)',
                    fontWeight: 700,
                  }}
                >
                  {p.category}
                  {p.isPremium ? ' · Members' : ''}
                </span>
                <h3
                  className="font-serif"
                  style={{ fontSize: '1.05rem', lineHeight: 1.3, margin: '0.4rem 0 0.35rem' }}
                >
                  {p.title}
                </h3>
                <p className="font-sans text-xs text-muted" style={{ margin: 0 }}>
                  {p.customAuthor || p.author.name || 'Staff'}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

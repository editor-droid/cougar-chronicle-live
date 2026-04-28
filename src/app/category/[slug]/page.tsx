import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  
  const posts = await prisma.post.findMany({
    where: { category: slug, state: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: { author: true }
  });

  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1);
  const headerFontClass = 'font-serif';

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <h1 className={`${headerFontClass} text-center`} style={{ fontSize: '3.5rem', marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
        {categoryName}
      </h1>
      
      {posts.length === 0 ? (
        <p className="text-center text-muted font-sans">No articles published in this category yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2.5rem' }}>
          {posts.map((post) => (
            <article key={post.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <Link href={`/article/${post.slug}`} style={{ width: '100%', aspectRatio: '16/9', backgroundColor: 'var(--surface-hover)', borderRadius: '0.5rem', marginBottom: '1rem', display: 'block', overflow: 'hidden' }}>
                {post.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </Link>
              <h3 className={headerFontClass} style={{ fontSize: '1.5rem', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                <Link href={`/article/${post.slug}`}>{post.title}</Link>
              </h3>
              <p className="text-muted text-sm font-sans">
                By {post.author.name} &bull; {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

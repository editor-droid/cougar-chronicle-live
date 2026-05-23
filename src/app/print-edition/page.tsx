import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import PrintCheckoutButtons from './PrintCheckoutButtons';

export const metadata: Metadata = {
  title: 'Print Edition',
  description: 'Where to find physical copies of The Cougar Chronicle on campus.',
};

export const revalidate = 60; // Revalidate every minute

export default async function PrintEditionPage() {
  const edition = await prisma.printEdition.findFirst({
    where: { isActive: true },
    include: {
      posts: {
        include: { author: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1000px', margin: '0 auto', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="font-serif" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Print Edition</h1>
        <p className="font-sans" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto', color: 'var(--muted)' }}>
          Get the latest physical copy of The Cougar Chronicle delivered straight to your door, or download the digital PDF instantly.
        </p>
      </div>
      
      {edition ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Cover Image */}
            <div style={{ flex: '1 1 300px', maxWidth: '400px', margin: '0 auto' }}>
              {edition.coverImageUrl ? (
                <img 
                  src={edition.coverImageUrl} 
                  alt={`Cover of ${edition.title}`} 
                  style={{ width: '100%', height: 'auto', borderRadius: '0.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
              ) : (
                <div style={{ width: '100%', aspectRatio: '8.5/11', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem' }}>
                  <span className="font-serif text-muted">No Cover Image</span>
                </div>
              )}
            </div>

            {/* Purchase Options */}
            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <h2 className="font-serif" style={{ fontSize: '2.5rem', color: 'var(--foreground)', marginBottom: '1rem' }}>{edition.title}</h2>
              
              <PrintCheckoutButtons printEditionId={edition.id} />
            </div>
          </div>

          {/* Table of Contents */}
          <div style={{ marginTop: '2rem', borderTop: '2px solid var(--border)', paddingTop: '2rem' }}>
            <h3 className="font-serif" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>Inside This Edition</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {edition.posts.length > 0 ? (
                edition.posts.map(post => (
                  <Link href={`/article/${post.slug}`} key={post.id} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', height: '100%', transition: 'box-shadow 0.2s ease', cursor: 'pointer' }} className="article-card-hover">
                      <h4 className="font-serif" style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.5rem', lineHeight: '1.3' }}>{post.title}</h4>
                      <p className="font-sans text-sm text-muted">
                        By {post.customAuthor || post.author?.name || 'Guest Contributor'}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="font-sans text-muted" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No articles have been assigned to this edition yet.</p>
              )}
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            .article-card-hover:hover {
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              border-color: var(--primary) !important;
            }
          `}} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
          <h2 className="font-serif" style={{ fontSize: '2rem', color: 'var(--muted)' }}>No Active Print Editions Available</h2>
          <p className="font-sans text-muted" style={{ marginTop: '1rem' }}>Please check back later.</p>
        </div>
      )}
    </div>
  );
}

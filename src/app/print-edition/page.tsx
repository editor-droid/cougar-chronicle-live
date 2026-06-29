import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { getArticleUrl } from '@/lib/routes';
import PrintCheckoutButtons from './PrintCheckoutButtons';

export const metadata: Metadata = {
  title: 'Print Edition',
  description: 'Where to find physical copies of The Cougar Chronicle on campus.',
  openGraph: {
    title: 'Print Edition | The Cougar Chronicle',
    description: 'Order physical and digital copies of The Cougar Chronicle.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Print Edition | The Cougar Chronicle',
    description: 'Order physical and digital copies of The Cougar Chronicle.',
    images: ['/default-og.png'],
  },
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

  if (edition && edition.posts) {
    edition.posts.sort((a, b) => {
      if (a.printEditionOrder !== null && b.printEditionOrder !== null) {
        return a.printEditionOrder - b.printEditionOrder;
      }
      if (a.printEditionOrder !== null) return -1;
      if (b.printEditionOrder !== null) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
        <h1 className="font-serif" style={{ fontSize: '3.5rem', margin: 0 }}>Print Edition</h1>
      </div>
      
      <p className="font-sans" style={{ fontSize: '1.25rem', maxWidth: '600px', color: 'var(--muted)', marginBottom: '3rem' }}>
        Get the latest physical copy of The Cougar Chronicle delivered straight to your door, or download the digital PDF instantly.
      </p>
      
      {edition ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Cover Image */}
            <div style={{ flex: '1 1 300px', maxWidth: '400px', margin: '0 auto' }}>
              {edition.coverImageUrl ? (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '8.5/11', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                  <Image 
                    src={edition.coverImageUrl} 
                    alt={`Cover of ${edition.title}`} 
                    fill
                    priority
                    sizes="(max-width: 480px) 100vw, 400px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
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
                  <Link href={getArticleUrl(post)} key={post.id} style={{ textDecoration: 'none' }}>
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

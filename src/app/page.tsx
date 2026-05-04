import prisma from '@/lib/prisma';
import Link from 'next/link';
import SubscribeForm from '@/components/SubscribeForm';

export const revalidate = 60; // ISR revalidation

export default async function Home() {
  // Query more posts to fill out the expanded layout
  const allPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
    take: 20
  });

  // Editorials / Top stories
  const topStories = allPosts.slice(0, 4);
  const mainStory = topStories[0];
  const sideStories = topStories.slice(1);

  // News Block
  const newsPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', category: 'news' },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
    take: 4
  });

  // Faith Block
  const faithPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', category: 'faith' },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
    take: 4
  });

  // Opinion Block
  const opinionPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', category: 'opinion' },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
    take: 4
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', paddingBottom: '4rem' }}>
      {/* 1. TOP EDITORIALS / HERO */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {mainStory && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Link href={`/article/${mainStory.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/7', backgroundColor: 'var(--surface-hover)', marginBottom: '1rem', overflow: 'hidden' }}>
                {mainStory.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainStory.imageUrl} alt={mainStory.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <span className="font-serif text-muted">The Cougar Chronicle</span>
                  </div>
                )}
              </div>
              <h1 className="font-serif" style={{ fontSize: '3rem', lineHeight: 1.1, marginBottom: '1rem' }}>{mainStory.title}</h1>
              <div 
                className="font-sans text-muted" 
                style={{ fontSize: '1.25rem', marginBottom: '1rem', maxWidth: '800px' }}
                dangerouslySetInnerHTML={{ __html: mainStory.content ? mainStory.content.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...' : '' }} 
              />
              <div className="font-sans" style={{ fontWeight: 'bold' }}>By {mainStory.author.name}</div>
            </Link>
          </div>
        )}
        
        {/* Secondary Top Stories */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          {sideStories.map(story => (
            <Link href={`/article/${story.slug}`} key={story.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <h2 className="font-serif" style={{ fontSize: '1.5rem', lineHeight: 1.2, marginBottom: '0.5rem' }}>{story.title}</h2>
              <div className="font-sans text-muted text-sm" style={{ fontWeight: 'bold', marginBottom: '1rem' }}>By {story.author.name}</div>
              <div 
                className="font-sans text-sm" 
                dangerouslySetInnerHTML={{ __html: story.content ? story.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...' : '' }} 
              />
            </Link>
          ))}
        </div>
      </section>

      {/* 2. NEWS BLOCK */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
          <h2 className="font-serif" style={{ fontSize: '2rem', margin: 0, color: 'var(--primary)' }}>News</h2>
          <Link href="/category/news" className="font-sans" style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.875rem' }}>View All</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
          {newsPosts.map(post => (
            <Link href={`/article/${post.slug}`} key={post.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: 'var(--surface-hover)', marginBottom: '1rem' }}>
                {post.imageUrl && <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <h3 className="font-serif" style={{ fontSize: '1.25rem', lineHeight: 1.3, marginBottom: '0.5rem' }}>{post.title}</h3>
              <div className="font-sans text-muted text-sm">By {post.author.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. SUBSCRIBE BANNER */}
      <section id="subscribe" style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '4rem 2rem', textAlign: 'center', margin: '0 -1.5rem', borderRadius: '0.5rem' }}>
        <h2 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'white' }}>Stay Informed</h2>
        <p className="font-sans" style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 2rem auto' }}>
          Get the absolute best of the Cougar Chronicle delivered straight to your inbox. Faith, News, and Opinion for the BYU community.
        </p>
        <SubscribeForm />
      </section>

      {/* 4. FAITH BLOCK */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
          <h2 className="font-serif" style={{ fontSize: '2rem', margin: 0, color: 'var(--primary)' }}>Faith</h2>
          <Link href="/category/faith" className="font-sans" style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.875rem' }}>View All</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
          {faithPosts.map(post => (
            <Link href={`/article/${post.slug}`} key={post.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: 'var(--surface-hover)', marginBottom: '1rem' }}>
                {post.imageUrl && <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <h3 className="font-serif" style={{ fontSize: '1.25rem', lineHeight: 1.3, marginBottom: '0.5rem' }}>{post.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. OPINION BLOCK */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
          <h2 className="font-serif" style={{ fontSize: '2rem', margin: 0, color: 'var(--primary)' }}>Opinion</h2>
          <Link href="/category/opinion" className="font-sans" style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.875rem' }}>View All</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
          {opinionPosts.map(post => (
            <Link href={`/article/${post.slug}`} key={post.id} style={{ textDecoration: 'none', color: 'inherit', padding: '1.5rem', backgroundColor: '#f8f9fa', border: '1px solid var(--border)' }}>
              <h3 className="font-serif" style={{ fontSize: '1.5rem', lineHeight: 1.3, marginBottom: '1rem' }}>{post.title}</h3>
              <div className="font-sans text-sm" style={{ fontWeight: 'bold' }}>By {post.author.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. PRINT EDITION CTA */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 2rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', backgroundColor: '#faf9f5' }}>
        <h2 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Support Independent Journalism</h2>
        <p className="font-sans text-muted" style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '2rem', fontSize: '1.1rem' }}>
          The Cougar Chronicle relies on reader support to bring you national-grade news and opinion. Consider subscribing to our print edition or making a donation.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/print-edition" className="btn btn-primary font-sans" style={{ fontSize: '1.1rem', padding: '0.75rem 1.5rem' }}>Order Print Edition</Link>
          <Link href="/donate" className="btn btn-secondary font-sans" style={{ fontSize: '1.1rem', padding: '0.75rem 1.5rem' }}>Donate Now</Link>
        </div>
      </section>

    </div>
  )
}

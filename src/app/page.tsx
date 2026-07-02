import prisma from '@/lib/prisma';
import Link from 'next/link';
import { getArticleUrl } from '@/lib/routes';
import Image from 'next/image';
import SubscribeForm from '@/components/SubscribeForm';
import PrintCheckoutButtons from '@/app/print-edition/PrintCheckoutButtons';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Cougar Chronicle | Faith, Reason, and Politics at BYU',
  description: 'National-grade news platform for the BYU community. Faith, News, and Opinion.',
  openGraph: {
    title: 'The Cougar Chronicle | Faith, Reason, and Politics at BYU',
    description: 'Faith, News, and Opinion for the BYU community. Independent conservative journalism.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Cougar Chronicle | Faith, Reason, and Politics at BYU',
    description: 'Faith, News, and Opinion for the BYU community.',
    images: ['/default-og.png'],
  },
};

// Force dynamic rendering to prevent stale caching issues on the homepage
export const dynamic = 'force-dynamic';

export default async function Home() {
  const allPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', printEditionId: null, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    include: { author: true },
    take: 20
  });

  // Top stories for the Hero block
  const mainStory = allPosts[0];
  const sideStories = allPosts.slice(1, 5); // 4 stories for the sidebar stack

  // News category posts
  const newsPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', category: 'news', printEditionId: null, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    include: { author: true },
    take: 4
  });

  // Faith category posts
  const faithPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', category: 'faith', printEditionId: null, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    include: { author: true },
    take: 4
  });

  // Opinion category posts (Text-centric focus)
  const opinionPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', category: 'opinion', printEditionId: null, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    include: { author: true },
    take: 4
  });

  // America 250 series posts (big monthly series)
  const america250Posts = await prisma.post.findMany({
    where: { isAmerica250: true, state: 'PUBLISHED', publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    include: { author: true },
    take: 4
  });

  // Trending posts ordered by views
  const trendingPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', printEditionId: null, publishedAt: { lte: new Date() } },
    orderBy: { views: 'desc' },
    include: { author: true },
    take: 5
  });

  // Active Print Edition
  const activePrintEdition = await prisma.printEdition.findFirst({
    where: { isActive: true },
    include: {
      posts: {
        include: { author: true },
        take: 3
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="home-layout-dense animate-fade-in">
      
      {/* 1. TOP NEWS HEADER BLOCK (National Review / Daily Wire Style Hero) */}
      <section className="hero-section" style={{ marginBottom: '2.5rem' }}>
        {mainStory ? (
          <Link href={getArticleUrl(mainStory)} className="hero-main">
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: 'var(--surface-hover)', marginBottom: '1.25rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
              {mainStory.imageUrl ? (
                <Image 
                  src={mainStory.imageUrl} 
                  alt={mainStory.title} 
                  fill 
                  priority 
                  fetchPriority="high"
                  sizes="(max-width: 768px) 100vw, 800px"
                  style={{ objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center' }}>
                  <span className="font-serif text-muted" style={{ fontSize: '1.5rem', fontStyle: 'italic' }}>The Cougar Chronicle</span>
                </div>
              )}
            </div>
            <div style={{ paddingRight: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="feed-category" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', fontWeight: 800, fontSize: '0.8rem' }}>
                  {mainStory.category}
                </span>
                {mainStory.printEditionId && (
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                    🗞️ Print Edition
                  </span>
                )}
              </div>
              <h1 className="font-serif hero-headline" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--foreground)' }}>
                {mainStory.title}
              </h1>
              <div 
                className="font-sans hero-summary" 
                style={{ fontSize: '1.05rem', color: '#444', marginTop: '0.75rem', marginBottom: '1rem' }}
                dangerouslySetInnerHTML={{ 
                  __html: mainStory.content 
                    ? mainStory.content.replace(/<[^>]*>?/gm, '').substring(0, 180) + '...' 
                    : '' 
                }} 
              />
              <div className="font-sans text-sm" style={{ fontWeight: 'bold' }}>
                By <span style={{ color: 'var(--primary)' }}>{mainStory.customAuthor || mainStory.author.name}</span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="text-muted font-sans" style={{ padding: '4rem 0', textAlign: 'center' }}>No articles published yet. Check back soon!</div>
        )}

        {/* Sidebar stack of secondary stories */}
        <div className="hero-sidebar">
          <h2 className="font-sans text-xs text-muted" style={{ fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem', margin: 0 }}>
            LATEST DEVELOPMENTS
          </h2>
          {sideStories.length === 0 ? (
            <p className="text-muted font-sans text-sm">No additional stories available.</p>
          ) : (
            sideStories.map(story => (
              <Link href={getArticleUrl(story)} key={story.id} className="hero-side-card" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span className="feed-category" style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)' }}>
                      {story.category}
                    </span>
                    {story.printEditionId && (
                      <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                        🗞️ Print Edition
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif hero-side-headline" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.25 }}>
                    {story.title}
                  </h3>
                  <div className="font-sans text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    By {story.customAuthor || story.author.name}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>



      {/* 2. DENSE COLUMN LAYOUT (National Review style main content + right widgets) */}
      <div className="home-grid">
        
        {/* Left main feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
          
          {/* NEWS BAND */}
          {newsPosts.length > 0 && (
            <section className="category-band">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '3px double var(--primary)', paddingBottom: '0.5rem' }}>
                <h2 className="font-serif" style={{ fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: 800 }}>News</h2>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
                <Link href="/category/news" className="font-sans text-sm" style={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent)' }}>View All &rarr;</Link>
              </div>
              <div className="category-grid">
                {newsPosts.map(post => (
                  <Link href={getArticleUrl(post)} key={post.id} className="category-card">
                    <h3 className="font-serif category-headline" style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3 }}>
                      {post.title}
                    </h3>
                    <div className="font-sans text-xs text-muted" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      By {post.customAuthor || post.author.name} {post.printEditionId && <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>🗞️ Print</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FAITH BAND */}
          {faithPosts.length > 0 && (
            <section className="category-band">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '3px double var(--primary)', paddingBottom: '0.5rem' }}>
                <h2 className="font-serif" style={{ fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: 800 }}>Faith</h2>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
                <Link href="/category/faith" className="font-sans text-sm" style={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent)' }}>View All &rarr;</Link>
              </div>
              <div className="category-grid">
                {faithPosts.map(post => (
                  <Link href={getArticleUrl(post)} key={post.id} className="category-card">
                    <h3 className="font-serif category-headline" style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3 }}>
                      {post.title}
                    </h3>
                    <div className="font-sans text-xs text-muted" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      By {post.customAuthor || post.author.name} {post.printEditionId && <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)' }}>🗞️ Print</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* OPINION BAND (Wordy, text-centric columns in NR / DW style) */}
          {opinionPosts.length > 0 && (
            <section className="category-band">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '3px double var(--primary)', paddingBottom: '0.5rem' }}>
                <h2 className="font-serif" style={{ fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: 800 }}>Opinion</h2>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
                <Link href="/category/opinion" className="font-sans text-sm" style={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent)' }}>View All &rarr;</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {opinionPosts.map(post => (
                  <Link 
                    href={getArticleUrl(post)} 
                    key={post.id} 
                    style={{ 
                      padding: '1.5rem', 
                      backgroundColor: 'var(--surface)', 
                      borderTop: '3px solid var(--accent)', 
                      borderLeft: '1px solid var(--border)',
                      borderRight: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <span className="font-serif" style={{ fontSize: '3rem', color: 'var(--border)', display: 'block', lineHeight: 0.1, marginBottom: '0.5rem', fontFamily: 'Georgia, serif' }}>“</span>
                      <h3 className="font-serif" style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '1rem' }}>
                        {post.title}
                      </h3>
                    </div>
                    <div className="font-sans text-xs" style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      By {post.customAuthor || post.author.name} {post.printEditionId && <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700, backgroundColor: 'var(--surface-hover)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', border: '1px solid var(--border)', color: 'var(--foreground)', letterSpacing: 'normal' }}>🗞️ Print</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* AMERICA 250 SERIES BAND (big monthly op-ed series) */}
          {america250Posts.length > 0 && (
            <section className="category-band" style={{ backgroundColor: '#faf9f5', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', borderBottom: '3px double var(--primary)', paddingBottom: '0.5rem' }}>
                <h2 className="font-serif" style={{ fontSize: '1.35rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: 800 }}>🇺🇸 America 250</h2>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
                <Link href="/america-250" className="font-sans text-sm" style={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent)' }}>View the series &rarr;</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {america250Posts.map(post => (
                  <Link href={getArticleUrl(post)} key={post.id} className="font-serif" style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3, color: 'var(--foreground)' }}>
                    {post.title}
                    <div className="font-sans text-xs text-muted" style={{ marginTop: '0.25rem', fontWeight: 400 }}>
                      By {post.customAuthor || post.author.name}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="font-sans text-xs text-muted" style={{ marginTop: '0.75rem' }}>
                A monthly series of op-eds on the American founding, liberty, and what makes this country exceptional. 9+ writers contributing.
              </div>
            </section>
          )}

          {/* PRINT EDITION BAND */}
          {activePrintEdition && (
            <section className="category-band" style={{ backgroundColor: '#faf9f5', padding: '2rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '3px double var(--primary)', paddingBottom: '0.5rem' }}>
                <h2 className="font-serif" style={{ fontSize: '1.5rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: 800 }}>Print Edition</h2>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
                <Link href="/print-edition" className="font-sans text-sm" style={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent)' }}>Order Now &rarr;</Link>
              </div>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px', maxWidth: '250px' }}>
                  {activePrintEdition.coverImageUrl ? (
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '8.5/11', borderRadius: '0.25rem', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                      <Image 
                        src={activePrintEdition.coverImageUrl} 
                        alt={`Cover of ${activePrintEdition.title}`} 
                        fill
                        sizes="(max-width: 768px) 100vw, 250px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '8.5/11', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem' }}>
                      <span className="font-serif text-muted">No Cover</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column' }}>
                  <h3 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--foreground)' }}>
                    {activePrintEdition.title}
                  </h3>
                  <p className="font-sans text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    Support independent conservative journalism at BYU by ordering our high-quality physical print edition directly to your door.
                  </p>
                  <PrintCheckoutButtons printEditionId={activePrintEdition.id} />
                  
                  {activePrintEdition.posts && activePrintEdition.posts.length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                      <h4 className="font-sans text-xs text-muted" style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Inside This Issue</h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {activePrintEdition.posts.map(post => (
                          <li key={post.id}>
                            <Link href={getArticleUrl(post)} className="font-serif" style={{ fontSize: '1.1rem', fontWeight: 700, display: 'block', lineHeight: 1.3 }}>
                              {post.title}
                            </Link>
                            <span className="font-sans text-xs text-muted">By {post.customAuthor || post.author.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>

        {/* Right widgets column */}
        <div>
          
          {/* TRENDING WIDGET */}
          {trendingPosts.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h2 className="font-sans text-xs text-muted" style={{ fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', marginBottom: '1.25rem', fontSize: '0.75rem', margin: 0 }}>
                MOST POPULAR
              </h2>
              <ol className="trending-list-dense">
                {trendingPosts.map((post, index) => (
                  <li key={post.id}>
                    <span className="rank font-serif">{index + 1}</span>
                    <div>
                      <Link href={getArticleUrl(post)} className="font-serif" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', display: 'block', lineHeight: 1.3 }}>
                        {post.title}
                      </Link>
                      <span className="font-sans text-xs text-muted" style={{ marginTop: '0.25rem', display: 'block' }}>
                        {post.category} {post.printEditionId && '🗞️ Print'} &bull; {post.views} views
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* NEWSLETTER SUBSCRIBE BOX */}
          <div id="subscribe" className="newsletter-box" style={{ padding: '2rem', border: '1px solid var(--border)', borderRadius: '0.5rem', backgroundColor: 'var(--primary)', color: '#fff', textAlign: 'center' }}>
            <h2 className="font-serif" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#fff', marginTop: 0 }}>Stay Connected</h2>
            <p className="font-sans text-sm" style={{ opacity: 0.9, marginBottom: '1.5rem', lineHeight: 1.4 }}>
              Get our curated faith, campus news, and columns delivered straight to your inbox daily.
            </p>
            <SubscribeForm />
          </div>

          {/* PRINT EDITION PROMO */}
          <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '0.5rem', backgroundColor: '#faf9f5', textAlign: 'center' }}>
            <span className="font-sans text-xs" style={{ fontWeight: 800, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
              SUPPORT CHRONICLE
            </span>
            <h2 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.75rem', marginTop: 0 }}>Order Print Editions</h2>
            <p className="font-sans text-xs text-muted" style={{ marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Receive our high-grade quarterly physical papers shipped directly to your house. Help keep conservative BYU reporting alive.
            </p>
            <Link href="/print-edition" className="btn btn-secondary font-sans text-sm" style={{ width: '100%' }}>
              Order Print Edition
            </Link>
          </div>

        </div>

      </div>

      {/* 3. PRINT EDITION / SUPPORT CTA */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3.5rem 2rem', borderTop: '4px double var(--border)', borderBottom: '4px double var(--border)', backgroundColor: '#faf9f5', marginTop: '4rem', textAlign: 'center' }}>
        <h2 className="font-serif" style={{ fontSize: '2.25rem', marginBottom: '1rem', fontWeight: 800 }}>Support Independent BYU Journalism</h2>
        <p className="font-sans text-muted" style={{ maxWidth: '600px', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
          The Cougar Chronicle relies solely on private donor support to deliver real-time news and opinion root in eternal gospel principles. Support our staff writers today.
        </p>
        <div className="support-buttons-container" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/print-edition" className="btn btn-primary font-sans" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>Order Print Edition</Link>
          <Link href="/donate" className="btn btn-secondary font-sans" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>Donate Now</Link>
        </div>
      </section>

    </div>
  );
}

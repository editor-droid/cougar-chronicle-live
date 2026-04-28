import prisma from '@/lib/prisma';
import Link from 'next/link';

export const revalidate = 60; // ISR revalidation

export default async function Home() {
  const allPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
    take: 15
  });

  const topStories = allPosts.slice(0, 3);
  const latestFeed = allPosts.slice(3, 13);

  const trending = await prisma.post.findMany({
    where: { state: 'PUBLISHED' },
    orderBy: { views: 'desc' },
    take: 5
  });

  const faithPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', category: 'faith' },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
    take: 4
  });

  const opinionPosts = await prisma.post.findMany({
    where: { state: 'PUBLISHED', category: 'opinion' },
    orderBy: { createdAt: 'desc' },
    include: { author: true },
    take: 4
  });

  const mainStory = topStories[0];
  const sideStories = topStories.slice(1);

  return (
    <div className="home-layout-dense">
      <div className="home-grid">
        {/* Main Content Column */}
        <div className="main-column">
          {/* HERO SECTION */}
          {mainStory ? (
            <section className="hero-section">
              <Link href={`/article/${mainStory.slug}`} className="hero-main">
                {mainStory.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={mainStory.imageUrl} alt={mainStory.title} className="hero-img" />
                ) : (
                  <div className="hero-img" style={{ backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="font-serif text-muted" style={{ opacity: 0.5 }}>The Cougar Chronicle</span>
                  </div>
                )}
                <h1 className="font-serif hero-headline">{mainStory.title}</h1>
                <div 
                  className="hero-summary font-sans" 
                  dangerouslySetInnerHTML={{ __html: mainStory.content ? mainStory.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' : '' }} 
                />
                <div className="author-meta font-sans text-sm" style={{ fontWeight: 'bold' }}>By {mainStory.author.name}</div>
              </Link>
              
              <div className="hero-sidebar">
                {sideStories.map(story => (
                  <Link href={`/article/${story.slug}`} key={story.id} className="hero-side-card">
                    {story.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={story.imageUrl} alt={story.title} className="hero-side-img" />
                    ) : (
                      <div className="hero-side-img" style={{ backgroundColor: 'var(--surface-hover)' }}></div>
                    )}
                    <h2 className="font-serif hero-side-headline">{story.title}</h2>
                    <div className="author-meta font-sans text-sm" style={{marginTop: '0.25rem', fontWeight: 'bold' }}>By {story.author.name}</div>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <div className="font-sans">No stories available. Check back soon.</div>
          )}

          {/* LATEST FEED */}
          {latestFeed.length > 0 && (
            <section className="latest-feed">
              <div className="section-header">
                <h2 className="font-serif">The Latest</h2>
                <div className="section-divider"></div>
              </div>
              <div className="feed-list">
                {latestFeed.map(post => (
                  <Link href={`/article/${post.slug}`} key={post.id} className="feed-item">
                    <div className="feed-content">
                      <span className="feed-category">{post.category.toUpperCase()}</span>
                      <h3 className="font-serif feed-headline">{post.title}</h3>
                      <div className="author-meta font-sans text-xs">
                        {new Date(post.createdAt).toLocaleDateString()} &bull; By {post.author.name}
                      </div>
                    </div>
                    {post.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={post.imageUrl} alt={post.title} className="feed-img" />
                    ) : (
                      <div className="feed-img" style={{ backgroundColor: 'var(--surface-hover)' }}></div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar */}
        <aside className="right-sidebar">
          <div className="trending-widget sticky-widget">
            <div className="section-header">
              <h2 className="font-serif">Trending</h2>
            </div>
            <ul className="trending-list-dense">
              {trending.map((post, index) => (
                <li key={post.id}>
                  <span className="rank font-serif">{index + 1}</span>
                  <Link href={`/article/${post.slug}`} className="font-sans text-sm font-bold">
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="newsletter-box">
              <h3 className="font-serif" style={{ color: 'white' }}>Stay Informed</h3>
              <p className="font-sans text-sm" style={{ opacity: 0.9, marginBottom: '1.5rem', lineHeight: 1.5, color: 'white' }}>Get the absolute best of the Cougar Chronicle delivered to your inbox.</p>
              <input type="email" placeholder="Your email address" className="newsletter-input" />
              <button className="btn font-sans" style={{width: '100%', backgroundColor: 'white', color: 'var(--primary)', fontWeight: 'bold'}}>Subscribe</button>
            </div>
          </div>
        </aside>
      </div>

      {/* HORIZONTAL CATEGORY BAND - FAITH */}
      {faithPosts.length > 0 && (
        <section className="category-band">
          <div className="section-header">
            <h2 className="font-serif">Faith</h2>
            <div className="section-divider"></div>
          </div>
          <div className="category-grid">
            {faithPosts.map(post => (
              <Link href={`/article/${post.slug}`} key={post.id} className="category-card">
                {post.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={post.imageUrl} alt={post.title} className="category-img" />
                ) : (
                  <div className="category-img" style={{ backgroundColor: 'var(--surface-hover)' }}></div>
                )}
                <h3 className="font-serif category-headline">{post.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* HORIZONTAL CATEGORY BAND - OPINION */}
      {opinionPosts.length > 0 && (
        <section className="category-band" style={{backgroundColor: '#f8f9fa', padding: '2rem', margin: '2rem -1rem -2rem -1rem'}}>
          <div className="section-header">
            <h2 className="font-serif">Opinion</h2>
            <div className="section-divider"></div>
          </div>
          <div className="category-grid">
            {opinionPosts.map(post => (
              <Link href={`/article/${post.slug}`} key={post.id} className="category-card">
                <h3 className="font-serif category-headline" style={{fontSize: '1.25rem', marginBottom: '0.5rem'}}>{post.title}</h3>
                <div className="author-meta font-sans text-sm font-bold">By {post.author.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

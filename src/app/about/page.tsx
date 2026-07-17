import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about The Cougar Chronicle, our mission, and our editorial board.',
  keywords: [
    'About The Cougar Chronicle',
    'Conservative student organization BYU',
    'Independent journalism Brigham Young University',
    'Daily Universe alternative',
    'Turning Point USA BYU'
  ],
  openGraph: {
    title: 'About Us | The Cougar Chronicle',
    description: 'Learn about The Cougar Chronicle, our mission, and our editorial board.',
    images: [{ url: '/images/campus/byu-mountain-view.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | The Cougar Chronicle',
    description: 'Learn about The Cougar Chronicle, our mission, and our editorial board.',
    images: ['/images/campus/byu-mountain-view.jpg'],
  },
};

const campusGallery = [
  {
    src: '/images/campus/byu-maeser.jpg',
    alt: 'Karl G. Maeser Building on the BYU campus in Provo, Utah',
    caption: 'Maeser Building · BYU',
  },
  {
    src: '/images/campus/y-mountain-blossoms.jpg',
    alt: 'The Block Y on Y Mountain overlooking BYU campus',
    caption: 'Y Mountain · Provo',
  },
  {
    src: '/images/campus/provo-city-center-temple.jpg',
    alt: 'Provo City Center Temple in downtown Provo, Utah',
    caption: 'Provo City Center Temple',
  },
  {
    src: '/images/campus/byu-campus-winter.jpg',
    alt: 'BYU campus in winter with Y Mountain in the background',
    caption: 'Campus in winter',
  },
];

export default function AboutPage() {
  const team = {
    editors: [
      { name: 'Reagan Sumrall', title: 'Editor-in-Chief' },
      { name: 'Kimball Call', title: 'Lead Editor & Senior Contributor' },
      { name: 'James Haymore', title: 'Senior Contributor' },
      { name: 'Alexander Halpren', title: '' }
    ],
    contributors: [
      { name: 'Jonah Deforge', title: '' },
      { name: 'Joshua Beck', title: '' },
      { name: 'Kai Schwemmer', title: '' },
      { name: 'Tanner Moss', title: '' }
    ],
    social: [
      { name: 'Jax McKinney', title: 'Senior Contributor & Social Media Director' },
      { name: 'Carter Waite', title: '' },
      { name: 'Joshua Beck', title: '' },
      { name: 'Dallin Webecke', title: '' }
    ],
    emeritus: [
      { name: 'Jacob Christensen', title: '' },
      { name: 'Ian Farris', title: '' },
      { name: 'Logan Spears', title: '' },
      { name: 'Joseph Addington', title: '' },
      { name: 'Thomas Stevenson', title: '' },
      { name: 'Luke Hanson', title: '' }
    ]
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 'clamp(280px, 42vw, 420px)',
          overflow: 'hidden',
          marginBottom: '3rem',
        }}
      >
        <Image
          src="/images/campus/byu-mountain-view.jpg"
          alt="BYU campus and Y Mountain in Provo, Utah"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(27, 34, 83, 0.85) 0%, rgba(27, 34, 83, 0.45) 45%, rgba(27, 34, 83, 0.25) 100%)',
          }}
        />
        <div
          className="container"
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            minHeight: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingTop: '4rem',
            paddingBottom: '2.5rem',
          }}
        >
          <p
            className="font-sans"
            style={{
              color: 'rgba(255,255,255,0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}
          >
            Provo · Brigham Young University
          </p>
          <h1
            className="font-serif"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 3.75rem)', margin: 0, color: 'white', lineHeight: 1.1 }}
          >
            About Us
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: '1.2rem',
              color: 'rgba(255,255,255,0.9)',
              marginTop: '0.75rem',
              maxWidth: '36rem',
              lineHeight: 1.5,
            }}
          >
            News for the BYU community, from the conservative perspective.
          </p>
        </div>
      </div>

      <div className="container">
        {/* Mission + campus photo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center',
            marginBottom: '4rem',
          }}
        >
          <div className="font-sans" style={{ fontSize: '1.15rem', lineHeight: 1.8, color: 'var(--foreground)' }}>
            <h2
              className="font-serif"
              style={{ fontSize: '1.85rem', marginBottom: '1.25rem', color: 'var(--primary)' }}
            >
              Our Mission
            </h2>
            <p style={{ marginBottom: '1.5rem' }}>
              <strong>The Cougar Chronicle</strong> is an independently run student newspaper at BYU. Our mission is to
              articulate and spread the conservative perspective to the BYU community through the lens of the Gospel of
              Jesus Christ.
            </p>
            <p>
              We are not affiliated with BYU or the Church of Jesus Christ of Latter-day Saints. However, we wish to hold
              the standards and principles established in these institutions.
            </p>
          </div>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              boxShadow: '0 12px 32px rgba(27, 34, 83, 0.12)',
              border: '1px solid var(--border)',
            }}
          >
            <Image
              src="/images/campus/byu-maeser.jpg"
              alt="Karl G. Maeser Memorial Building on BYU campus"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* Campus photo strip */}
        <div style={{ marginBottom: '4.5rem' }}>
          <h2
            className="font-serif text-center"
            style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--primary)' }}
          >
            Home on the hill
          </h2>
          <p
            className="font-sans text-muted text-center"
            style={{ marginBottom: '1.75rem', maxWidth: '32rem', marginLeft: 'auto', marginRight: 'auto' }}
          >
            We report from Provo and the BYU campus — the place our writers live, study, and worship.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {campusGallery.map((shot) => (
              <figure
                key={shot.src}
                style={{
                  margin: 0,
                  position: 'relative',
                  aspectRatio: '4 / 3',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 25vw"
                  style={{ objectFit: 'cover' }}
                />
                <figcaption
                  className="font-sans"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '1.75rem 0.75rem 0.65rem',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {shot.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <h2 className="font-serif text-center" style={{ fontSize: '2.5rem', marginBottom: '2.5rem', color: 'var(--primary)' }}>
          Our Team
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div>
            <h3
              className="font-sans"
              style={{
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                fontWeight: 600,
                borderBottom: '2px solid var(--primary)',
                paddingBottom: '0.5rem',
              }}
            >
              Editors
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {team.editors.map((member, i) => (
                <div
                  key={i}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                    {member.name}
                  </div>
                  {member.title && (
                    <div className="font-sans text-sm text-primary" style={{ fontWeight: 600 }}>
                      {member.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3
              className="font-sans"
              style={{
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                fontWeight: 600,
                borderBottom: '2px solid var(--primary)',
                paddingBottom: '0.5rem',
              }}
            >
              Contributors
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {team.contributors.map((member, i) => (
                <div
                  key={i}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                    {member.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3
              className="font-sans"
              style={{
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                fontWeight: 600,
                borderBottom: '2px solid var(--primary)',
                paddingBottom: '0.5rem',
              }}
            >
              Social Media & Content
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {team.social.map((member, i) => (
                <div
                  key={i}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                    {member.name}
                  </div>
                  {member.title && (
                    <div className="font-sans text-sm text-primary" style={{ fontWeight: 600 }}>
                      {member.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3
              className="font-sans"
              style={{
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                fontWeight: 600,
                borderBottom: '2px solid var(--primary)',
                paddingBottom: '0.5rem',
              }}
            >
              Editors Emeritus
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {team.emeritus.map((member, i) => (
                <div
                  key={i}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                    {member.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import {
  TEAM_GROUP_LABELS,
  TEAM_GROUP_ORDER,
  getPublicTeam,
  groupTeamMembers,
  type TeamGroup,
  type TeamMember,
} from '@/lib/site-content';

function normalizePersonName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about The Cougar Chronicle, our mission, and our editorial board.',
  keywords: [
    'About The Cougar Chronicle',
    'Conservative student organization BYU',
    'Independent journalism Brigham Young University',
    'Daily Universe alternative',
    'Turning Point USA BYU',
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

export const dynamic = 'force-dynamic';

const campusGallery = [
  {
    src: '/images/campus/provo-utah-temple.jpg',
    alt: 'Provo Utah Temple',
    caption: 'Provo Utah Temple',
  },
  {
    src: '/images/campus/provo-city-center-temple.jpg',
    alt: 'Provo City Center Temple',
    caption: 'Provo City Center Temple',
  },
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
];

function renderTeamGrid(
  members: TeamMember[],
  authorByName: Map<string, string>
) {
  if (!members.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
      {members.map((member) => {
        const authorId = authorByName.get(normalizePersonName(member.name));
        const cardStyle = {
          padding: '1.5rem',
          backgroundColor: 'var(--surface)',
          borderRadius: '0.75rem',
          border: '1px solid var(--border)',
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        } as const;

        const inner = (
          <>
            <div
              className="font-serif"
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--foreground)',
                marginBottom: '0.25rem',
              }}
            >
              {member.name}
            </div>
            {member.title ? (
              <div className="font-sans text-sm text-primary" style={{ fontWeight: 600 }}>
                {member.title}
              </div>
            ) : null}
          </>
        );

        if (authorId) {
          return (
            <Link
              key={member.id}
              href={`/author/${authorId}`}
              style={cardStyle}
              className="about-staff-card"
            >
              {inner}
            </Link>
          );
        }

        return (
          <div key={member.id} style={cardStyle}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export default async function AboutPage() {
  const members = await getPublicTeam();
  const grouped = groupTeamMembers(members);

  const users = await prisma.user.findMany({
    where: {
      name: { not: null },
      role: { in: ['WRITER', 'EDITOR', 'ADMIN'] },
      archivedAt: null,
    },
    select: { id: true, name: true },
  });

  const authorByName = new Map<string, string>();
  for (const u of users) {
    if (!u.name) continue;
    const key = normalizePersonName(u.name);
    if (!authorByName.has(key)) {
      authorByName.set(key, u.id);
    }
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
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
            <h2 className="font-serif" style={{ fontSize: '1.85rem', marginBottom: '1.25rem', color: 'var(--primary)' }}>
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

        <div style={{ marginBottom: '4.5rem' }}>
          <div style={{ marginBottom: '1.5rem', maxWidth: '40rem' }}>
            <h2 className="font-serif" style={{ fontSize: '1.75rem', marginBottom: '0.65rem', color: 'var(--primary)' }}>
              Campus &amp; community
            </h2>
            <p className="font-sans text-muted" style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.65 }}>
              We live and write in Provo — covering Brigham Young University, local life, and the debates that shape our
              community. Independent journalism from the place our staff study, worship, and call home.
            </p>
          </div>
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
          {TEAM_GROUP_ORDER.map((group: TeamGroup) => {
            const list = grouped[group];
            if (!list.length) return null;
            return (
              <div key={group}>
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
                  {TEAM_GROUP_LABELS[group]}
                </h3>
                {renderTeamGrid(list, authorByName)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import VolunteerForm from '@/components/VolunteerForm';
import VideoHighlights from '@/components/VideoHighlights';
import prisma from '@/lib/prisma';
import { getMediaAppearances } from '@/lib/site-content';
import { resolveStreamEmbedUrl, resolveStreamThumbnailUrl } from '@/lib/videos';
import {
  PenTool,
  Video,
  Camera,
  Search,
  Smartphone,
  BookOpen,
  Users,
  Flag,
  FileText,
  Podcast,
  ExternalLink,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Apply to Join | The Cougar Chronicle',
  description:
    'We are accepting applications for staff writers, editors, photographers, and more at The Cougar Chronicle — independent conservative journalism at BYU.',
  openGraph: {
    title: 'Apply to Join | The Cougar Chronicle',
    description: 'Apply to join Utah’s premier independent conservative student newspaper.',
    images: [{ url: '/images/campus/byu-mountain-view.jpg', width: 1200, height: 630 }],
  },
};

const openPositions = [
  { title: 'Staff Writer', icon: <PenTool size={20} /> },
  { title: 'Print Editor', icon: <FileText size={20} /> },
  { title: 'Video Editor', icon: <Video size={20} /> },
  { title: 'Photographer', icon: <Camera size={20} /> },
  { title: 'Investigative Journalist', icon: <Search size={20} /> },
  { title: 'Content Creator', icon: <Smartphone size={20} /> },
];

const editorialFocus = [
  { title: 'BYU News', icon: <BookOpen size={20} /> },
  { title: 'Faith Issues', icon: <Users size={20} /> },
  { title: 'Family Issues', icon: <Users size={20} /> },
  { title: 'Utah Politics', icon: <Flag size={20} /> },
  { title: 'US Politics', icon: <Flag size={20} /> },
  { title: 'Conservative Thought', icon: <BookOpen size={20} /> },
];

const majorOps = [
  {
    image: '/images/campus/byu-mountain-view.jpg',
    title: 'Campus Coverage',
    description: 'Independent reporting from BYU and Provo.',
  },
  {
    image: '/images/campus/y-mountain-blossoms.jpg',
    title: 'Faith & Community',
    description: 'Stories rooted in the Gospel and campus life.',
  },
  {
    image: '/images/campus/byu-y-mountain-stadium.jpg',
    title: 'Big Moments',
    description: 'Statewide debates, elections, and investigations.',
  },
];

const alumni = [
  {
    name: 'Jacob Christensen',
    role: 'PhD Candidate in Political Philosophy at Baylor University',
    quote:
      'As Editor-in-Chief, I secured an internship at National Right to Life and launched the Chronicle’s first Print Edition.',
    image:
      'https://i0.wp.com/staging-1d61-thecougarchronicle4.wpcomstaging.com/wp-content/uploads/2025/09/image2.jpeg?ssl=1',
  },
  {
    name: 'Joseph Addington',
    role: 'Associate Editor & Latin America Columnist at The American Conservative',
    quote:
      'My time as Opinion Editor and interviewing Michael Knowles prepared me for a career in conservative journalism.',
    image:
      'https://i0.wp.com/staging-1d61-thecougarchronicle4.wpcomstaging.com/wp-content/uploads/2025/09/image1.jpeg?ssl=1',
  },
  {
    name: 'Eva Terry',
    role: 'Fellow at Deseret News, Politics & Outdoors Beat',
    quote:
      'Interning at Deseret News and The Spectator, and joining the White House press pool, shaped my journalism career.',
    image:
      'https://i0.wp.com/staging-1d61-thecougarchronicle4.wpcomstaging.com/wp-content/uploads/2025/09/image0.jpeg?ssl=1',
  },
  {
    name: 'Thomas Stevenson',
    role: 'Political Editor at The Post Millennial',
    quote:
      'As co-founder and Editor-in-Chief of the Cougar Chronicle, I led it to win ISI’s Collegiate Network Best New Publication in 2023.',
    image:
      'https://i0.wp.com/staging-1d61-thecougarchronicle4.wpcomstaging.com/wp-content/uploads/2025/09/image0.png?ssl=1',
  },
];

function interestHref(title: string) {
  return `/recruiting?interest=${encodeURIComponent(title)}#apply`;
}

export default async function RecruitingPage() {
  const [highlightVideos, mediaAppearances] = await Promise.all([
    prisma.video.findMany({
      where: { isActive: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 3,
    }),
    getMediaAppearances(),
  ]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3.5rem' }}>
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          textAlign: 'center',
          marginBottom: '2.75rem',
          padding: 'clamp(3rem, 8vw, 4.5rem) 1.25rem',
          overflow: 'hidden',
          color: 'white',
        }}
      >
        <Image
          src="/images/campus/byu-campus-winter.jpg"
          alt="BYU campus and Y Mountain in Provo"
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
              'linear-gradient(135deg, rgba(27, 34, 83, 0.9) 0%, rgba(27, 34, 83, 0.78) 55%, rgba(27, 34, 83, 0.88) 100%)',
          }}
        />
        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
          <p
            className="font-sans"
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              fontSize: '0.75rem',
              fontWeight: 700,
              opacity: 0.85,
              marginBottom: '0.75rem',
            }}
          >
            Independent · Selective · Provo
          </p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2.25rem, 5.5vw, 3.25rem)',
              margin: '0 0 0.85rem 0',
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.15,
            }}
          >
            Apply to join our team
          </h1>
          <p
            className="font-sans"
            style={{ fontSize: '1.15rem', opacity: 0.92, marginBottom: '1.75rem', lineHeight: 1.5 }}
          >
            We are accepting applications for Utah&apos;s leading independent conservative student newspaper — on the
            cutting edge of campus journalism, rooted in faith and serious ideas.
          </p>
          <a
            href="#apply"
            className="btn"
            style={{
              backgroundColor: 'white',
              color: 'var(--primary)',
              fontSize: '1.05rem',
              padding: '0.7rem 1.75rem',
              fontWeight: 700,
              borderRadius: '2rem',
              display: 'inline-block',
              textDecoration: 'none',
            }}
          >
            Start your application
          </a>
        </div>
      </div>

      <div className="container">
        {/* Open positions + focus — compact & clickable */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.75rem',
            marginBottom: '2.5rem',
          }}
        >
          <div>
            <h2
              className="font-serif"
              style={{
                fontSize: '1.35rem',
                borderBottom: '2px solid var(--border)',
                paddingBottom: '0.5rem',
                marginBottom: '0.85rem',
                color: 'var(--primary)',
              }}
            >
              Open positions
            </h2>
            <p className="font-sans text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Tap a role to apply with that interest selected.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {openPositions.map((pos) => (
                <Link
                  key={pos.title}
                  href={interestHref(pos.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  <span style={{ color: 'var(--primary)' }}>{pos.icon}</span>
                  <span className="font-sans" style={{ fontSize: '0.98rem', fontWeight: 600 }}>
                    {pos.title}
                  </span>
                  <span className="font-sans text-muted" style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600 }}>
                    Apply →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2
              className="font-serif"
              style={{
                fontSize: '1.35rem',
                borderBottom: '2px solid var(--border)',
                paddingBottom: '0.5rem',
                marginBottom: '0.85rem',
                color: 'var(--primary)',
              }}
            >
              Editorial focus
            </h2>
            <p className="font-sans text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Beats we cover — select one when you apply.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {editorialFocus.map((focus) => (
                <Link
                  key={focus.title}
                  href={interestHref(focus.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span style={{ color: 'var(--primary)' }}>{focus.icon}</span>
                  <span className="font-sans" style={{ fontSize: '0.98rem', fontWeight: 600 }}>
                    {focus.title}
                  </span>
                  <span className="font-sans text-muted" style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600 }}>
                    Apply →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quals + expect — compact */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.75rem',
          }}
        >
          <div
            style={{
              padding: '1.35rem 1.5rem',
              backgroundColor: 'var(--surface)',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
            }}
          >
            <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.65rem', color: 'var(--primary)' }}>
              Qualifications
            </h3>
            <ul className="font-sans" style={{ fontSize: '0.95rem', lineHeight: 1.55, paddingLeft: '1.15rem', color: 'var(--muted)' }}>
              <li style={{ marginBottom: '0.4rem' }}>
                Current student at a Utah school or a school owned by The Church of Jesus Christ of Latter-day Saints.
              </li>
              <li>Politically conservative; aligned with our mission.</li>
            </ul>
          </div>
          <div
            style={{
              padding: '1.35rem 1.5rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              borderRadius: '0.75rem',
            }}
          >
            <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.65rem', color: 'white' }}>
              What to expect
            </h3>
            <ul className="font-sans" style={{ fontSize: '0.95rem', lineHeight: 1.55, paddingLeft: '1.15rem', opacity: 0.92 }}>
              <li style={{ marginBottom: '0.4rem' }}>
                <strong>Staff writers:</strong> roughly one article every 4–8 weeks.
              </li>
              <li style={{ marginBottom: '0.4rem' }}>
                <strong>Editors & creators:</strong> assigned projects at a similar pace.
              </li>
              <li>Selective process — we build a professional newsroom, not a club flyer.</li>
            </ul>
          </div>
        </div>

        {/* Benefits — tighter */}
        <div style={{ marginBottom: '2.75rem' }}>
          <h2
            className="font-serif text-center"
            style={{ fontSize: '1.75rem', marginBottom: '1.25rem', color: 'var(--primary)' }}
          >
            Why join
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            {[
              {
                icon: <Users size={26} />,
                text: 'Network with peers, policymakers, and journalists nationwide.',
              },
              {
                icon: <FileText size={26} />,
                text: 'Real bylines and professional newsroom experience.',
              },
              {
                icon: <Podcast size={26} />,
                text: 'Top work opens doors to national shows and outlets.',
              },
              {
                icon: <Flag size={26} />,
                text: 'Shape conservative discourse in Utah and beyond.',
              },
            ].map((b, i) => (
              <div
                key={i}
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: 'var(--primary)', marginBottom: '0.65rem', display: 'flex', justifyContent: 'center' }}>
                  {b.icon}
                </div>
                <p className="font-sans" style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Media appearances — admin-managed at /dashboard/team-media */}
        {mediaAppearances.length > 0 && (
          <div
            style={{
              marginBottom: '2.75rem',
              padding: '1.75rem 1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          >
            <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '0.35rem', color: 'var(--primary)' }}>
              See where we&apos;ve shown up
            </h2>
            <p className="font-sans text-muted" style={{ fontSize: '0.95rem', marginBottom: '1.15rem', lineHeight: 1.5 }}>
              Press, podcasts, and national media featuring Chronicle reporting and staff.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.85rem',
              }}
            >
              {mediaAppearances.map((m) => {
                const inner = (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <ExternalLink size={14} style={{ color: 'var(--primary)' }} />
                      <span className="font-sans" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {m.outlet}
                      </span>
                    </div>
                    {m.title ? (
                      <p className="font-sans" style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 0.25rem' }}>
                        {m.title}
                      </p>
                    ) : null}
                    {m.note ? (
                      <p className="font-sans text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.45, margin: 0 }}>
                        {m.note}
                      </p>
                    ) : null}
                  </>
                );
                const cardStyle = {
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                } as const;
                return m.url ? (
                  <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" style={cardStyle}>
                    {inner}
                  </a>
                ) : (
                  <div key={m.id} style={cardStyle}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Major ops + always the latest 3 videos */}
        <div style={{ marginBottom: '2.75rem' }}>
          <h2
            className="font-serif text-center"
            style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--primary)' }}
          >
            Major operations & highlights
          </h2>
          <p className="font-sans text-center text-muted" style={{ fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Campus, faith, and the stories that define our newsroom.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.15rem',
              marginBottom: highlightVideos.length ? '1.75rem' : 0,
            }}
          >
            {majorOps.map((op) => (
              <div
                key={op.title}
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: '0.65rem',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: '160px' }}>
                  <Image src={op.image} alt={op.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '1rem 1.15rem' }}>
                  <h3 className="font-serif" style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {op.title}
                  </h3>
                  <p className="font-sans text-muted" style={{ fontSize: '0.88rem', lineHeight: 1.45, margin: 0 }}>
                    {op.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {highlightVideos.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <h3 className="font-serif" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--primary)' }}>
                  Recent video highlights
                </h3>
                <Link
                  href="/videos"
                  className="font-sans text-sm"
                  style={{ fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
                >
                  All videos →
                </Link>
              </div>
              <VideoHighlights
                videos={highlightVideos.map((v) => ({
                  id: v.id,
                  slug: v.slug,
                  title: v.title,
                  description: null,
                  platform: v.platform,
                  embedUrl: resolveStreamEmbedUrl(v),
                  thumbnailUrl: resolveStreamThumbnailUrl(v),
                  durationSec: v.durationSec,
                }))}
                title=""
                variant="home"
                showSeeAll={false}
                linkToWatchPage
              />
            </div>
          )}
        </div>

        {/* Alumni (shorter set) */}
        <div style={{ marginBottom: '2.75rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 className="font-serif" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              Alumni achievements
            </h2>
            <p className="font-sans text-muted" style={{ fontSize: '0.95rem' }}>
              From DC to national outlets — Chronicle alumni lead.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.15rem',
            }}
          >
            {alumni.map((alum) => (
              <div
                key={alum.name}
                style={{
                  backgroundColor: 'var(--background)',
                  padding: '1.35rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <Image
                  src={alum.image}
                  alt={alum.name}
                  width={88}
                  height={88}
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    margin: '0 auto 1rem',
                    border: '2px solid var(--primary)',
                  }}
                />
                <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  {alum.name}
                </h3>
                <p className="font-sans text-primary" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.65rem' }}>
                  {alum.role}
                </p>
                <p className="font-sans text-muted" style={{ fontSize: '0.88rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                  &ldquo;{alum.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Apply form */}
        <div
          id="apply"
          style={{
            position: 'relative',
            padding: '2.5rem 1.25rem',
            textAlign: 'center',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <Image
              src="/images/campus/byu-maeser.jpg"
              alt=""
              fill
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
              aria-hidden
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(253, 251, 247, 0.95) 0%, rgba(253, 251, 247, 0.93) 100%)',
              }}
            />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              We are accepting applications
            </h2>
            <p
              className="font-sans text-muted"
              style={{ fontSize: '1rem', marginBottom: '1.5rem', maxWidth: '520px', margin: '0 auto 1.5rem' }}
            >
              Submit a thoughtful application. Leadership reviews every submission.
            </p>
            <Suspense
              fallback={
                <p className="font-sans text-muted" style={{ padding: '2rem' }}>
                  Loading application form…
                </p>
              }
            >
              <VolunteerForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';
import VolunteerForm from '@/components/VolunteerForm';
import { getActiveOpenRoles, getMediaAppearances } from '@/lib/site-content';
import {
  Flag,
  FileText,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  Mic2,
  Network,
  Plane,
} from 'lucide-react';
import { linkPreview } from '@/lib/link-preview';
import YoutubeThumb from '@/components/YoutubeThumb';
import ApplyInterestPicker from './ApplyInterestPicker';

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

const majorOps = [
  {
    image: '/images/campus/byu-maeser.jpg',
    title: 'Campus Coverage',
    description: 'Independent reporting from BYU and Provo.',
  },
  {
    image: '/images/campus/provo-utah-temple.jpg',
    title: 'Faith & Community',
    description: 'Stories rooted in the Gospel and campus life.',
  },
  {
    image: '/images/campus/provo-city-center-temple.jpg',
    title: 'Utah & Beyond',
    description: 'Politics, family, and investigations that matter.',
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

export default async function RecruitingPage() {
  const [mediaAppearances, openRoles] = await Promise.all([
    getMediaAppearances(),
    getActiveOpenRoles(),
  ]);
  const interestOptions = openRoles.map((r) => r.title);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2.5rem' }}>
      {/* Hero — shorter */}
      <div
        style={{
          position: 'relative',
          textAlign: 'center',
          marginBottom: '1.75rem',
          padding: 'clamp(2.25rem, 5vw, 3.25rem) 1.25rem',
          overflow: 'hidden',
          color: 'white',
        }}
      >
        <Image
          src="/images/campus/byu-mountain-view.jpg"
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
        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '680px' }}>
          <p
            className="font-sans"
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              fontSize: '0.72rem',
              fontWeight: 700,
              opacity: 0.85,
              marginBottom: '0.55rem',
            }}
          >
            We are accepting applications
          </p>
          <h1
            className="font-serif"
            style={{
              fontSize: 'clamp(2rem, 5vw, 2.85rem)',
              margin: '0 0 0.65rem 0',
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.15,
            }}
          >
            Apply to join our team
          </h1>
          <p
            className="font-sans"
            style={{ fontSize: '1.05rem', opacity: 0.92, marginBottom: '1.25rem', lineHeight: 1.45 }}
          >
            Utah&apos;s premier independent conservative student newspaper — selective, professional, and rooted in faith.
          </p>
          <a
            href="#apply"
            className="btn"
            style={{
              backgroundColor: 'white',
              color: 'var(--primary)',
              fontSize: '1rem',
              padding: '0.6rem 1.5rem',
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
        <ApplyInterestPicker roles={openRoles} />

        {/* Quals + expect — compact */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              padding: '1.1rem 1.25rem',
              backgroundColor: 'var(--surface)',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
            }}
          >
            <h3 className="font-serif" style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              Qualifications
            </h3>
            <ul className="font-sans" style={{ fontSize: '0.9rem', lineHeight: 1.5, paddingLeft: '1.1rem', color: 'var(--muted)', margin: 0 }}>
              <li style={{ marginBottom: '0.3rem' }}>
                Current student at a Utah school or Church-owned school.
              </li>
              <li>Conservative values; aligned with our mission.</li>
            </ul>
          </div>
          <div
            style={{
              padding: '1.1rem 1.25rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              borderRadius: '0.75rem',
            }}
          >
            <h3 className="font-serif" style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'white' }}>
              What to expect
            </h3>
            <ul className="font-sans" style={{ fontSize: '0.9rem', lineHeight: 1.5, paddingLeft: '1.1rem', opacity: 0.92, margin: 0 }}>
              <li style={{ marginBottom: '0.3rem' }}>
                <strong>Staff writers:</strong> ~1 article every 4–8 weeks.
              </li>
              <li>Selective process — a professional newsroom, not a club flyer.</li>
            </ul>
          </div>
        </div>

        {/* Benefits and opportunities — flyer + career pipeline */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h2
            className="font-serif"
            style={{ fontSize: '1.4rem', marginBottom: '0.35rem', color: 'var(--primary)', textAlign: 'left' }}
          >
            Benefits and opportunities
          </h2>
          <p
            className="font-sans text-muted"
            style={{
              fontSize: '0.92rem',
              marginBottom: '1rem',
              maxWidth: '36rem',
              marginLeft: 0,
              marginRight: 0,
              lineHeight: 1.45,
              textAlign: 'left',
            }}
          >
            More than a byline — real training, a stronger résumé, and doors into journalism, politics, and advocacy.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {[
              {
                icon: <Network size={22} />,
                title: 'Powerful networking',
                text: 'Connect with like-minded students and with state and federal leaders, policymakers, and journalists nationwide.',
              },
              {
                icon: <FileText size={22} />,
                title: 'Real-world journalism',
                text: 'Gain valuable experience in authentic, impactful reporting — and help shape the discourse in Utah and beyond.',
              },
              {
                icon: <Mic2 size={22} />,
                title: 'National exposure',
                text: 'Top stories open doors to podcast appearances and other outlets. Past writers have been featured on Fox News, the Charlie Kirk Show, and more.',
              },
              {
                icon: <Briefcase size={22} />,
                title: 'Internships & careers',
                text: 'Access internship and career opportunities with reputable organizations in journalism, politics, and advocacy — especially for editors and staff writers.',
              },
              {
                icon: <GraduationCap size={22} />,
                title: 'Build your résumé',
                text: 'Publish under a professional masthead and grow a portfolio that stands out for jobs, graduate school, and media roles.',
              },
              {
                icon: <Award size={22} />,
                title: 'Scholarships & leadership',
                text: 'Eligible for potential scholarships and the chance to grow into an editor role on staff.',
              },
              {
                icon: <Plane size={22} />,
                title: 'Events, travel & more',
                text: 'Access special events, networking and travel opportunities, and other perks as they arise — including invitations to appear on podcasts to discuss your work.',
              },
              {
                icon: <Flag size={22} />,
                title: 'Shape the debate',
                text: 'Advance the conservative cause with serious campus coverage, faith, family, and investigations that matter.',
              },
            ].map((b) => (
              <div
                key={b.title}
                style={{
                  padding: '1.05rem 1.1rem',
                  backgroundColor: 'var(--surface)',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div
                  style={{
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '999px',
                      background: 'rgba(27, 34, 83, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {b.icon}
                  </span>
                  <h3
                    className="font-serif"
                    style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}
                  >
                    {b.title}
                  </h3>
                </div>
                <p
                  className="font-sans text-muted"
                  style={{ fontSize: '0.88rem', lineHeight: 1.45, margin: 0 }}
                >
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Appearances — admin at /dashboard/appearances */}
        {mediaAppearances.length > 0 && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1.15rem 1.15rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
            }}
          >
            <h2 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>
              See where we&apos;ve shown up
            </h2>
            <p className="font-sans text-muted" style={{ fontSize: '0.88rem', marginBottom: '0.85rem', lineHeight: 1.45 }}>
              Press, podcasts, and guest spots — separate from our own Videos library.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '0.85rem',
              }}
            >
              {mediaAppearances.map((m) => {
                const preview = linkPreview(m.url || '');
                const href = m.url
                  ? m.url.startsWith('http')
                    ? m.url
                    : `https://${m.url}`
                  : undefined;
                // Don't surface filler notes like "featured video"
                const note =
                  m.note && !/featured\s*video/i.test(m.note) ? m.note : null;
                const title =
                  m.title && !/featured\s*video/i.test(m.title) ? m.title : null;

                const card = (
                  <>
                    <div
                      style={{
                        position: 'relative',
                        aspectRatio: '16 / 9',
                        background: 'linear-gradient(145deg, #1b2253, #3d4a8c)',
                        overflow: 'hidden',
                      }}
                    >
                      {preview.kind === 'youtube' && preview.videoId ? (
                        <YoutubeThumb videoId={preview.videoId} />
                      ) : preview.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview.src}
                          alt=""
                          referrerPolicy="no-referrer"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            objectPosition: 'center',
                            padding: '1.5rem',
                            background: '#1b2253',
                          }}
                        />
                      ) : null}
                      {preview.kind === 'youtube' && (
                        <span
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                          }}
                        >
                          <span
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: 'rgba(27,34,83,0.88)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </span>
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '0.75rem 0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: title || note ? '0.3rem' : 0 }}>
                        {href ? <ExternalLink size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} /> : null}
                        <span className="font-sans" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {m.outlet || 'Appearance'}
                        </span>
                      </div>
                      {title ? (
                        <p className="font-sans" style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0 0 0.2rem', lineHeight: 1.35 }}>
                          {title}
                        </p>
                      ) : null}
                      {note ? (
                        <p className="font-sans text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.4, margin: 0 }}>
                          {note}
                        </p>
                      ) : null}
                    </div>
                  </>
                );

                const wrapStyle = {
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--background)',
                  textDecoration: 'none',
                  color: 'inherit',
                  overflow: 'hidden',
                  display: 'block',
                } as const;

                return href ? (
                  <a key={m.id} href={href} target="_blank" rel="noopener noreferrer" style={wrapStyle}>
                    {card}
                  </a>
                ) : (
                  <div key={m.id} style={wrapStyle}>
                    {card}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Major operations — static cards only */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2
            className="font-serif text-center"
            style={{ fontSize: '1.4rem', marginBottom: '0.35rem', color: 'var(--primary)' }}
          >
            What we cover
          </h2>
          <p className="font-sans text-center text-muted" style={{ fontSize: '0.88rem', marginBottom: '0.85rem' }}>
            Campus, faith, family, and politics — serious work.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
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
                <div style={{ position: 'relative', width: '100%', height: '120px' }}>
                  <Image src={op.image} alt={op.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '0.75rem 0.9rem' }}>
                  <h3 className="font-serif" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                    {op.title}
                  </h3>
                  <p className="font-sans text-muted" style={{ fontSize: '0.82rem', lineHeight: 1.4, margin: 0 }}>
                    {op.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alumni — three highlights only */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
            <h2 className="font-serif" style={{ fontSize: '1.4rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>
              Alumni achievements
            </h2>
            <p className="font-sans text-muted" style={{ fontSize: '0.88rem', margin: 0 }}>
              From Provo to national outlets.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {alumni.slice(0, 3).map((alum) => (
              <div
                key={alum.name}
                style={{
                  backgroundColor: 'var(--background)',
                  padding: '1rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <Image
                  src={alum.image}
                  alt={alum.name}
                  width={72}
                  height={72}
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    margin: '0 auto 0.65rem',
                    border: '2px solid var(--primary)',
                  }}
                />
                <h3 className="font-serif" style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {alum.name}
                </h3>
                <p className="font-sans text-primary" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.45rem' }}>
                  {alum.role}
                </p>
                <p className="font-sans text-muted" style={{ fontSize: '0.8rem', fontStyle: 'italic', lineHeight: 1.4, margin: 0 }}>
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
            padding: '1.75rem 1.15rem',
            textAlign: 'center',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <Image
              src="/images/campus/byu-campus-winter.jpg"
              alt=""
              fill
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
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
            <h2 className="font-serif" style={{ fontSize: '1.75rem', marginBottom: '0.35rem', color: 'var(--primary)' }}>
              We are accepting applications
            </h2>
            <p
              className="font-sans text-muted"
              style={{ fontSize: '0.95rem', marginBottom: '1.15rem', maxWidth: '480px', margin: '0 auto 1.15rem' }}
            >
              Leadership reviews every submission. Optional social handles and a writing sample strengthen your application.
            </p>
            <Suspense
              fallback={
                <p className="font-sans text-muted" style={{ padding: '2rem' }}>
                  Loading application form…
                </p>
              }
            >
              <VolunteerForm interestOptions={interestOptions} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

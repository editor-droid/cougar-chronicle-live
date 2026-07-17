import type { Metadata } from 'next';
import Image from 'next/image';
import VolunteerForm from '@/components/VolunteerForm';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with The Cougar Chronicle or join our team.',
  keywords: [
    'Contact conservative BYU writers',
    'Write for The Cougar Chronicle',
    'Daily Universe alternative',
    'Turning Point USA BYU'
  ],
  openGraph: {
    title: 'Contact Us | The Cougar Chronicle',
    description: 'Get in touch with The Cougar Chronicle or join our team.',
    images: [{ url: '/images/campus/y-mountain-blossoms.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | The Cougar Chronicle',
    description: 'Get in touch with The Cougar Chronicle or join our team.',
    images: ['/images/campus/y-mountain-blossoms.jpg'],
  },
};

export default function ContactPage() {
  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 'clamp(240px, 36vw, 340px)',
          overflow: 'hidden',
          marginBottom: '2.5rem',
        }}
      >
        <Image
          src="/images/campus/y-mountain-blossoms.jpg"
          alt="Y Mountain and BYU campus buildings in Provo, Utah"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(27, 34, 83, 0.88) 0%, rgba(27, 34, 83, 0.5) 55%, rgba(27, 34, 83, 0.3) 100%)',
          }}
        />
        <div
          className="container"
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingTop: '3.5rem',
            paddingBottom: '2rem',
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
              marginBottom: '0.65rem',
            }}
          >
            Based in Provo, Utah
          </p>
          <h1 className="font-serif" style={{ fontSize: 'clamp(2.25rem, 5vw, 3.25rem)', margin: 0, color: 'white' }}>
            Contact Us
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: '1.05rem',
              color: 'rgba(255,255,255,0.9)',
              marginTop: '0.65rem',
              maxWidth: '34rem',
              lineHeight: 1.55,
            }}
          >
            Feedback, tips, partnerships, or questions — we read every message.
          </p>
        </div>
      </div>

      <div className="container">
        {/* Contact form + campus side image */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2.5rem',
            alignItems: 'start',
            marginBottom: '3.5rem',
          }}
        >
          <div style={{ maxWidth: '700px' }}>
            <div style={{ marginBottom: '1.25rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h2 className="font-serif" style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)' }}>
                Send a message
              </h2>
            </div>
            <p className="font-sans text-muted" style={{ fontSize: '1rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              We value your feedback and contributions. Use the form below (we do not publish our email publicly to avoid
              spam).
            </p>
            <ContactForm />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '4 / 3',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: '0 10px 28px rgba(27, 34, 83, 0.1)',
              }}
            >
              <Image
                src="/images/campus/byu-campus-winter.jpg"
                alt="BYU campus in winter with Y Mountain behind"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 10',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <Image
                src="/images/campus/provo-utah-temple.jpg"
                alt="Provo Utah Temple"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>
            <p className="font-sans text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.5, textAlign: 'center' }}>
              Independent student journalism from the heart of Provo and the BYU community.
            </p>
          </div>
        </div>

        {/* Volunteer band with photo backdrop */}
        <div
          style={{
            position: 'relative',
            borderRadius: '1rem',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            marginBottom: '1rem',
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
                background: 'linear-gradient(135deg, rgba(253, 251, 247, 0.96) 0%, rgba(253, 251, 247, 0.9) 100%)',
              }}
            />
          </div>
          <div style={{ position: 'relative', zIndex: 1, padding: '2.25rem 1.5rem 2.5rem', textAlign: 'center' }}>
            <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
              Work with the Cougar Chronicle
            </h2>
            <p
              className="font-sans text-foreground"
              style={{
                fontSize: '1rem',
                marginBottom: '1.25rem',
                lineHeight: 1.6,
                maxWidth: '700px',
                margin: '0 auto 1.5rem',
              }}
            >
              Looking for students interested in writing, editing, video, design, or copywriting. Contributing has opened
              doors to internships and opportunities unlike any other campus journalism.
            </p>
            <VolunteerForm />
          </div>
        </div>
      </div>
    </div>
  );
}

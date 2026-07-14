import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/auth';
import MembershipCheckoutButton from '@/components/MembershipCheckoutButton';

export const metadata: Metadata = {
  title: 'Become a Member',
  description:
    'Support independent journalism at BYU. Unlock all premium digital stories and the annual Print Volume PDF.',
  openGraph: {
    title: 'Chronicle Member | The Cougar Chronicle',
    description:
      'All premium digital access + annual Print Volume PDF. Funded by readers, not campus or ads.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
};

const benefits = [
  'Unlimited access to every premium digital article, all year',
  'Annual Print Volume PDF the day it drops (one Volume per year)',
  'Three gift unlocks to share premium stories with friends',
  'Support independent student journalism — no campus funding, no ads driving coverage',
  'Member status on your account; cancel anytime through Stripe',
];

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const session = await auth();
  const isMember = Boolean(session?.user && (await isUserMember(session.user.id)));

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '720px', marginTop: '2rem', marginBottom: '5rem' }}>
      {success === 'true' && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #6ee7b7',
            color: '#065f46',
            padding: '1rem 1.25rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <strong className="font-sans">Welcome, Member.</strong>{' '}
          <span className="font-sans text-sm">Your membership is active. Enjoy full digital access.</span>
        </div>
      )}

      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p
          className="font-sans text-xs"
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--primary)',
            fontWeight: 700,
            marginBottom: '0.75rem',
          }}
        >
          Chronicle Member
        </p>
        <h1 className="font-serif" style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', lineHeight: 1.15, marginBottom: '1rem' }}>
          Independent journalism at BYU. Funded by readers.
        </h1>
        <p className="font-sans text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '36rem', margin: '0 auto' }}>
          Campus coverage shouldn&apos;t depend on administrators or advertisers. Join as a Member and unlock
          every digital story plus the annual Print Volume PDF.
        </p>
      </header>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '2rem 1.75rem',
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        <p className="font-serif" style={{ fontSize: '2.5rem', color: 'var(--primary)', margin: '0 0 0.25rem' }}>
          $48
          <span className="font-sans" style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--muted)' }}>
            /year
          </span>
        </p>
        <p className="font-sans text-sm text-muted" style={{ marginBottom: '1.5rem' }}>
          About $4/month · Cancel anytime
        </p>

        {isMember ? (
          <div>
            <p className="font-sans font-bold" style={{ color: '#15803d', marginBottom: '0.75rem' }}>
              You&apos;re already a Member
            </p>
            <Link href="/account" className="btn btn-secondary font-sans">
              Manage account
            </Link>
          </div>
        ) : (
          <MembershipCheckoutButton
            style={{ width: '100%', maxWidth: '22rem', padding: '0.85rem 1.25rem', fontSize: '1rem' }}
          />
        )}
        {!session?.user && !isMember && (
          <p className="font-sans text-xs text-muted" style={{ marginTop: '0.75rem' }}>
            You&apos;ll sign in or create an account to complete checkout.
          </p>
        )}
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          What you get
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {benefits.map((b) => (
            <li
              key={b}
              className="font-sans"
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        style={{
          background: '#faf9f5',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        <h2 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
          One Print Volume a year
        </h2>
        <p className="font-sans text-sm text-muted" style={{ lineHeight: 1.6, margin: 0 }}>
          We publish one printed Volume annually — not a weekly paper. Members receive the digital PDF when it
          launches (no extra $10). Prefer a physical copy? You can still order one from the{' '}
          <Link href="/print-edition" style={{ color: 'var(--primary)' }}>
            Print Edition
          </Link>{' '}
          page.
        </p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          FAQ
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Faq q="How is this different from $1.99 per article?">
            Single-article unlocks are for one story. Membership unlocks every premium digital article for a full
            year, plus the Volume PDF and gift unlocks — better if you read more than a couple of locked pieces.
          </Faq>
          <Faq q="Can I just donate instead?">
            Yes —{' '}
            <Link href="/donate" style={{ color: 'var(--primary)' }}>
              donate anytime
            </Link>{' '}
            with no membership benefits. During the{' '}
            <Link href="/fundraiser" style={{ color: 'var(--primary)' }}>
              August Fundraising Drive
            </Link>
            , gifts of $48+ from that page include a full year of membership.
          </Faq>
          <Faq q="Do I need an account?">
            Yes — membership is tied to your login so premium unlocks work on every device. Checkout will send you
            to sign in if needed.
          </Faq>
          <Faq q="How do I cancel?">
            Use the billing link on your{' '}
            <Link href="/account" style={{ color: 'var(--primary)' }}>
              Account
            </Link>{' '}
            page (Stripe Customer Portal), or email us if you need help.
          </Faq>
        </div>
      </section>

      <p className="font-sans text-center text-sm text-muted">
        Free weekly email?{' '}
        <Link href="/#subscribe" style={{ color: 'var(--primary)' }}>
          Subscribe to the digest
        </Link>{' '}
        — no membership required.
      </p>
    </div>
  );
}

async function isUserMember(userId: string) {
  const { default: prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSubscribed: true },
  });
  return user?.isSubscribed === true;
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-sans font-bold" style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>
        {q}
      </h3>
      <p className="font-sans text-sm text-muted" style={{ lineHeight: 1.6, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

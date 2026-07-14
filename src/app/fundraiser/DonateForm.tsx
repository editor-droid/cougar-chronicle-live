'use client';
import { useState } from 'react';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import {
  AUGUST_MEMBERSHIP_MIN,
  AUGUST_SUPPORTER_MIN,
} from '@/lib/membership-constants';

export default function DonateForm() {
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isHovered, setIsHovered] = useState<number | null>(null);

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setAmount(Number(e.target.value));
  };

  const qualifiesForMembership = amount >= AUGUST_MEMBERSHIP_MIN;
  const isNamedSupporter =
    amount >= AUGUST_SUPPORTER_MIN && amount < AUGUST_MEMBERSHIP_MIN;

  const formStyle: React.CSSProperties = {
    padding: '2rem',
    background: 'rgba(var(--surface-rgb, 255, 255, 255), 0.8)',
    backdropFilter: 'blur(16px)',
    borderRadius: '1rem',
    maxWidth: '500px',
    margin: '0 auto',
    border: '1px solid rgba(var(--border-rgb, 0, 0, 0), 0.1)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
  };

  const getBtnStyle = (tier: number) => ({
    flex: '1 1 45%',
    fontSize: '1.15rem',
    padding: '0.75rem',
    borderRadius: '0.75rem',
    border: amount === tier && !customAmount ? '2px solid var(--accent)' : '1px solid var(--border)',
    backgroundColor:
      amount === tier && !customAmount ? 'rgba(var(--accent-rgb, 0, 112, 243), 0.1)' : 'var(--background)',
    color: amount === tier && !customAmount ? 'var(--accent)' : 'var(--foreground)',
    fontWeight: amount === tier && !customAmount ? 700 : 500,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered === tier && amount !== tier ? 'translateY(-2px)' : 'none',
    boxShadow: isHovered === tier && amount !== tier ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
  });

  const statusMessage = () => {
    if (qualifiesForMembership) {
      return (
        <>
          <strong>America 250 Founding Member</strong> — one year of membership (premium digital stories, Print
          Volume PDF, gift unlocks). Use the same email as your account (or{' '}
          <Link href="/login?callbackUrl=/fundraiser" style={{ color: 'var(--primary)' }}>
            sign in first
          </Link>
          ).
        </>
      );
    }
    if (isNamedSupporter) {
      return (
        <>
          <strong>America 250 Patriot</strong> — thank you for celebrating the founding with us. (Named gift —
          membership perks begin at <strong>${AUGUST_MEMBERSHIP_MIN}</strong>.)
        </>
      );
    }
    return (
      <>
        Give <strong>${AUGUST_SUPPORTER_MIN}</strong> to be recognized as an America 250 Patriot, or{' '}
        <strong>${AUGUST_MEMBERSHIP_MIN}+</strong> for a full year as a Founding Member.
      </>
    );
  };

  return (
    <div style={formStyle}>
      <h2
        className="font-serif"
        style={{ fontSize: '1.75rem', marginBottom: '0.25rem', color: 'var(--foreground)', textAlign: 'center' }}
      >
        America 250 · August Drive
      </h2>
      <p className="font-sans text-muted" style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.95rem' }}>
        Celebrate the founding — and fund independent campus journalism.
      </p>

      <div
        style={{
          background: qualifiesForMembership ? '#ecfdf5' : isNamedSupporter ? '#fffbeb' : '#f8fafc',
          border: `1px solid ${
            qualifiesForMembership ? '#6ee7b7' : isNamedSupporter ? '#fcd34d' : 'var(--border)'
          }`,
          borderRadius: '0.5rem',
          padding: '0.85rem 1rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}
      >
        <p
          className="font-sans text-sm"
          style={{
            margin: 0,
            lineHeight: 1.45,
            color: qualifiesForMembership ? '#065f46' : isNamedSupporter ? '#92400e' : 'var(--muted)',
          }}
        >
          {statusMessage()}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[25, 48, 50, 100, 250].map((tier) => (
          <button
            key={tier}
            type="button"
            onMouseEnter={() => setIsHovered(tier)}
            onMouseLeave={() => setIsHovered(null)}
            style={getBtnStyle(tier)}
            onClick={() => {
              setAmount(tier);
              setCustomAmount('');
            }}
          >
            ${tier}
            {tier === AUGUST_SUPPORTER_MIN ? (
              <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, opacity: 0.85 }}>Patriot</span>
            ) : null}
            {tier === AUGUST_MEMBERSHIP_MIN ? (
              <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, opacity: 0.85 }}>Founding</span>
            ) : null}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <label
          className="font-sans text-sm text-muted"
          style={{ display: 'block', marginBottom: '0.75rem', textAlign: 'center', fontWeight: 500 }}
        >
          Or enter a custom amount:
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            position: 'relative',
            maxWidth: '250px',
            margin: '0 auto',
          }}
        >
          <span style={{ position: 'absolute', left: '1rem', fontSize: '1.25rem', color: 'var(--muted)', fontWeight: 600 }}>
            $
          </span>
          <input
            type="number"
            value={customAmount}
            onChange={handleCustomChange}
            placeholder="Other"
            className="font-sans"
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 2.5rem',
              fontSize: '1.25rem',
              borderRadius: '0.75rem',
              border: '2px solid var(--border)',
              backgroundColor: 'var(--background)',
              transition: 'border-color 0.2s',
              fontWeight: 600,
            }}
          />
        </div>
      </div>

      <form action="/api/stripe/checkout" method="POST">
        <input type="hidden" name="type" value="donate" />
        <input type="hidden" name="amount" value={amount} />
        <input
          type="hidden"
          name="metadata"
          value={JSON.stringify({ campaign: 'august_fundraiser' })}
        />
        <button
          type="submit"
          className="font-sans"
          style={{
            width: '100%',
            fontSize: '1.25rem',
            padding: '1.25rem',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: 700,
            cursor: amount >= 1 ? 'pointer' : 'not-allowed',
            opacity: amount >= 1 ? 1 : 0.7,
            boxShadow: '0 8px 20px rgba(var(--primary-rgb, 0,0,0), 0.25)',
          }}
          disabled={!amount || amount < 1}
        >
          Donate ${amount || 0}
          {qualifiesForMembership
            ? ' · Founding Member'
            : isNamedSupporter
              ? ' · Patriot'
              : ''}
        </button>
      </form>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1.5rem',
          color: 'var(--muted)',
        }}
      >
        <Lock size={16} />
        <span className="font-sans" style={{ fontSize: '0.875rem' }}>
          Secure checkout powered by Stripe
        </span>
      </div>
    </div>
  );
}

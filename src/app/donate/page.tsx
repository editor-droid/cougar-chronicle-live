'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DONATION_CAMPAIGN, DONATION_SOURCE } from '@/lib/donations';
import { track } from '@/lib/ga-client';

function DonateForm() {
  const searchParams = useSearchParams();
  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showThanks, setShowThanks] = useState(false);
  const [purchased, setPurchased] = useState<string | null>(null);

  const from = searchParams.get('from') || '';
  const article = searchParams.get('article') || '';

  const source = useMemo(() => {
    if (from === DONATION_SOURCE.ARTICLE_END || from === DONATION_SOURCE.ARTICLE_MID) {
      return from;
    }
    if (from) return from;
    return DONATION_SOURCE.DONATE_PAGE;
  }, [from]);

  const metadata = useMemo(
    () =>
      JSON.stringify({
        campaign: DONATION_CAMPAIGN.GENERAL,
        source,
        sourceDetail: article || '',
      }),
    [source, article]
  );

  useEffect(() => {
    const success = searchParams.get('success');
    const purchase = searchParams.get('purchase');
    if (success === 'true') {
      setShowThanks(true);
      setPurchased(purchase);
      // Clean the URL so refresh doesn't re-show forever (keep shareable path clean)
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        url.searchParams.delete('purchase');
        window.history.replaceState({}, '', url.pathname + (url.search || ''));
      }
    }
  }, [searchParams]);

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setAmount(Number(e.target.value));
  };

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', minHeight: '60vh' }}>
      <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
        <h1 className="font-serif" style={{ fontSize: '3.5rem', margin: 0 }}>
          Support The Cougar Chronicle
        </h1>
      </div>

      {showThanks && (
        <div
          role="status"
          style={{
            marginBottom: '2rem',
            padding: '1.25rem 1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(5, 150, 105, 0.35)',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            maxWidth: '600px',
          }}
        >
          <p
            className="font-serif"
            style={{ margin: 0, fontSize: '1.35rem', color: '#065f46', fontWeight: 600 }}
          >
            Thank you{purchased ? ` for your $${purchased} gift` : ''}!
          </p>
          <p className="font-sans" style={{ margin: '0.5rem 0 0', color: '#047857', lineHeight: 1.5 }}>
            Your support keeps independent campus journalism free of advertiser pressure. We couldn&apos;t do
            this without readers like you.
          </p>
          <p style={{ margin: '0.85rem 0 0' }}>
            <Link href="/" className="font-sans" style={{ color: '#065f46', fontWeight: 600 }}>
              ← Back to the latest stories
            </Link>
          </p>
        </div>
      )}

      <p
        className="font-sans"
        style={{ fontSize: '1.25rem', maxWidth: '600px', color: 'var(--muted)', marginBottom: '3rem' }}
      >
        Your donations allow us to remain independent and continue bringing rigorous, conservative journalism
        to the BYU community.
      </p>

      <div
        style={{
          padding: '3rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '0.5rem',
          maxWidth: '600px',
          margin: '0 auto',
          border: '1px solid var(--border)',
        }}
      >
        <h2
          className="font-serif"
          style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--foreground)' }}
        >
          Make a Donation
        </h2>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
          }}
        >
          {[10, 25, 50, 100].map((tier) => (
            <button
              key={tier}
              type="button"
              className={`btn ${amount === tier && !customAmount ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setAmount(tier);
                setCustomAmount('');
              }}
              style={{ fontSize: '1.25rem', padding: '0.75rem 2rem' }}
            >
              ${tier}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Or enter a custom amount:
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>$</span>
            <input
              type="number"
              value={customAmount}
              onChange={handleCustomChange}
              placeholder="Custom amount"
              className="font-sans"
              style={{
                padding: '0.75rem',
                fontSize: '1.25rem',
                borderRadius: '0.25rem',
                border: '1px solid var(--border)',
                maxWidth: '200px',
                textAlign: 'center',
              }}
            />
          </div>
        </div>

        <form
          action="/api/stripe/checkout"
          method="POST"
          onSubmit={() => {
            track('begin_checkout', { currency: 'USD', value: amount });
          }}
        >
          <input type="hidden" name="type" value="donate" />
          <input type="hidden" name="amount" value={amount} />
          <input type="hidden" name="metadata" value={metadata} />
          <button
            type="submit"
            className="btn btn-primary font-sans"
            style={{ width: '100%', fontSize: '1.25rem', padding: '1rem' }}
            disabled={!amount || amount < 1}
          >
            Donate ${amount || 0}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ marginTop: '2rem', minHeight: '40vh' }}>
          <p className="font-sans text-muted">Loading…</p>
        </div>
      }
    >
      <DonateForm />
    </Suspense>
  );
}

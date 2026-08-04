'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addManualDonation } from './actions';

const field: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.85rem',
  borderRadius: '0.65rem',
  border: '1px solid #e8eaf0',
  background: 'var(--surface-hover)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.95rem',
};

export default function ManualDonationForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <div className="dash-card" style={{ padding: '1.25rem 1.35rem', marginBottom: '1.25rem' }}>
      <p
        className="font-sans"
        style={{
          margin: '0 0 0.35rem',
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#6b7280',
        }}
      >
        Offline gifts
      </p>
      <h2 className="font-serif" style={{ fontSize: '1.35rem', margin: '0 0 0.4rem', color: '#1B2253' }}>
        Add donation manually
      </h2>
      <p className="font-sans text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
        Checks, Venmo, offline gifts — counts toward the fundraiser total.
      </p>
      {message && (
        <p
          className="font-sans text-sm"
          style={{
            marginBottom: '0.75rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '0.65rem',
            background: /fail|error/i.test(message) ? 'rgba(185,28,28,0.08)' : 'rgba(5,150,105,0.1)',
            color: /fail|error/i.test(message) ? '#991b1b' : '#065f46',
          }}
        >
          {message}
        </p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end',
        }}
      >
        <div>
          <label className="font-sans text-sm text-muted">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="font-sans" style={field} />
        </div>
        <div>
          <label className="font-sans text-sm text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="font-sans"
            style={field}
          />
        </div>
        <div>
          <label className="font-sans text-sm text-muted">Amount ($)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-sans"
            style={field}
          />
        </div>
        <button
          type="button"
          className="dash-btn dash-btn-primary"
          disabled={pending || !amount}
          onClick={() => {
            setMessage('');
            startTransition(async () => {
              try {
                await addManualDonation({
                  name: name || undefined,
                  email: email || undefined,
                  amount: parseFloat(amount),
                });
                setName('');
                setEmail('');
                setAmount('');
                setMessage('Donation added.');
                router.refresh();
              } catch (e) {
                setMessage(e instanceof Error ? e.message : 'Failed to add donation');
              }
            });
          }}
        >
          {pending ? 'Saving…' : 'Add donation'}
        </button>
      </div>
    </div>
  );
}

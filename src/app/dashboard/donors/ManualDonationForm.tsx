'use client';

import { useState, useTransition } from 'react';
import { addManualDonation } from './actions';

export default function ManualDonationForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--border)',
        marginBottom: '2rem',
      }}
    >
      <h2 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
        Add donation manually
      </h2>
      <p className="font-sans text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
        Checks, Venmo, offline gifts — counts toward the fundraiser total.
      </p>
      {message && (
        <p className="font-sans text-sm" style={{ marginBottom: '0.75rem', color: message.includes('fail') ? '#991b1b' : '#065f46' }}>
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
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-sans"
            style={{ width: '100%', padding: '0.55rem', borderRadius: '0.3rem', border: '1px solid var(--border)' }}
          />
        </div>
        <div>
          <label className="font-sans text-sm text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="font-sans"
            style={{ width: '100%', padding: '0.55rem', borderRadius: '0.3rem', border: '1px solid var(--border)' }}
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
            style={{ width: '100%', padding: '0.55rem', borderRadius: '0.3rem', border: '1px solid var(--border)' }}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary font-sans"
          disabled={pending || !amount}
          onClick={() => {
            setMessage('');
            startTransition(async () => {
              try {
                await addManualDonation({
                  name,
                  email,
                  amount: Number(amount),
                });
                setName('');
                setEmail('');
                setAmount('');
                setMessage('Donation recorded.');
              } catch (e) {
                setMessage(e instanceof Error ? e.message : 'Failed');
              }
            });
          }}
        >
          {pending ? 'Saving…' : 'Add'}
        </button>
      </div>
    </div>
  );
}

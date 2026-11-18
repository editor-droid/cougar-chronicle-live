'use client';

import { useState } from 'react';
import { track } from '@/lib/ga-client';
import { NEWSLETTER_JOINED_KEY } from '@/lib/newsletter-signup';

export default function SubscribeForm({
  onSuccess,
  layout = 'card',
}: {
  onSuccess?: () => void;
  /** `bar` is the compact mobile strip. `card` is the existing stacked form. */
  layout?: 'card' | 'bar';
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState(''); // honeypot
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus('loading');
    
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, website: honeypot }),
      });
      
      if (res.ok) {
        setStatus('success');
        setMessage('Thank you for subscribing!');
        setEmail('');
        setName('');
        
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(NEWSLETTER_JOINED_KEY, '1');
          } catch {
            // Private mode still counts as a successful signup.
          }
          track('generate_lead', { currency: 'USD', value: 0 });
          track('sign_up', { method: 'newsletter' });
          if (window.fbq) {
            window.fbq('track', 'Lead');
          }
          console.log('[Tracking] Lead event fired');
        }

        if (onSuccess) {
          setTimeout(onSuccess, 1500);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setMessage(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  if (layout === 'bar') {
    return (
      <form onSubmit={handleSubmit} className="nl-sticky-form">
        <p className="nl-sticky-label font-sans">Daily briefing</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          required
          autoComplete="email"
        />
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="nl-sticky-hp"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending' : status === 'success' ? 'Joined' : 'Join'}
        </button>
        {status === 'error' && <span className="nl-sticky-msg">{message}</span>}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <div className="newsletter-form-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '0.75rem' }}>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First Name (optional)" 
          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.25rem', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '1rem', color: '#333' }} 
        />
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address" 
          required
          style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.25rem', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '1rem', color: '#333' }} 
        />
        {/* Honeypot - hidden from real users, bots often fill it */}
        <input 
          type="text" 
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={{ display: 'none' }} 
          tabIndex={-1} 
          autoComplete="off"
        />
        <button 
          type="submit" 
          disabled={status === 'loading'}
          className="btn font-sans" 
          style={{ width: '100%', backgroundColor: 'white', color: 'var(--primary)', fontWeight: 'bold', padding: '0.75rem 1.5rem', marginTop: '0.25rem' }}
        >
          {status === 'loading' ? 'Sending...' : 'Subscribe'}
        </button>
      </div>
      {status === 'success' && <div style={{ color: '#4ade80', fontSize: '0.875rem' }}>{message}</div>}
      {status === 'error' && <div style={{ color: '#f87171', fontSize: '0.875rem' }}>{message}</div>}
    </form>
  );
}

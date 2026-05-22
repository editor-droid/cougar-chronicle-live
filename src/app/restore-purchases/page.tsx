'use client';

import { useState } from 'react';
import { restorePurchases } from './actions';

export default function RestorePurchasesPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await restorePurchases(email);

    if (res.error) {
      setMessage({ type: 'error', text: res.error });
    } else {
      setMessage({ type: 'success', text: 'Success! We just emailed you a list of all your purchased articles.' });
      setEmail('');
    }
    
    setLoading(false);
  };

  return (
    <div style={{ padding: '6rem 2rem', textAlign: 'center', minHeight: '60vh', maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="font-serif" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Restore Purchases</h1>
      <p className="font-sans" style={{ fontSize: '1.25rem', marginBottom: '3rem', color: 'var(--muted)' }}>
        Did you lose the link to an article you purchased? Enter your email address below and we will send you a digest of all your magic access links.
      </p>
      
      <div style={{ padding: '3rem', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label htmlFor="email" className="font-sans" style={{ display: 'block', textAlign: 'left', marginBottom: '0.5rem', fontWeight: 600 }}>
              Email Address
            </label>
            <input 
              id="email"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="font-sans"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary font-sans" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Restore Access Links'}
          </button>
        </form>

        {message && (
          <div 
            className="font-sans"
            style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              borderRadius: '0.25rem', 
              backgroundColor: message.type === 'success' ? '#e6f4ea' : '#fce8e6',
              color: message.type === 'success' ? '#137333' : '#c5221f',
              border: `1px solid ${message.type === 'success' ? '#ceead6' : '#fad2cf'}`
            }}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

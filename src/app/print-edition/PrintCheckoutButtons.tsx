'use client';

import { useState } from 'react';

export default function PrintCheckoutButtons({ printEditionId }: { printEditionId: string }) {
  const [isLoading, setIsLoading] = useState<'physical' | 'digital' | null>(null);

  const handleCheckout = async (type: 'physical_print' | 'digital_print') => {
    try {
      setIsLoading(type === 'physical_print' ? 'physical' : 'digital');
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type,
          metadata: { printEditionId }
        }),
      });

      const session = await res.json();
      if (session.url) {
        window.location.href = session.url;
      } else {
        alert('Failed to initialize checkout');
        setIsLoading(null);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during checkout.');
      setIsLoading(null);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
      {/* Physical Copy */}
      <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
        <h3 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Physical Copy</h3>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>$15.00</div>
        <button 
          onClick={() => handleCheckout('physical_print')} 
          disabled={isLoading !== null}
          className="btn btn-primary font-sans" 
          style={{ width: '100%', padding: '0.75rem' }}
        >
          {isLoading === 'physical' ? 'Loading...' : 'Order by Mail'}
        </button>
      </div>

      {/* Digital Copy */}
      <div style={{ padding: '2rem', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
        <h3 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Digital PDF</h3>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>$10.00</div>
        <button 
          onClick={() => handleCheckout('digital_print')} 
          disabled={isLoading !== null}
          className="btn btn-secondary font-sans" 
          style={{ width: '100%', padding: '0.75rem' }}
        >
          {isLoading === 'digital' ? 'Loading...' : 'Download PDF'}
        </button>
      </div>
    </div>
  );
}

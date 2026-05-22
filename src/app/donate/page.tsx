
'use client';
import { useState } from 'react';

export default function DonatePage() {
  const [amount, setAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setAmount(Number(e.target.value));
  };

  return (
    <div style={{ padding: '6rem 2rem', textAlign: 'center', minHeight: '60vh' }}>
      <h1 className="font-serif" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Support The Cougar Chronicle</h1>
      <p className="font-sans" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 3rem auto', color: 'var(--muted)' }}>
        Your donations allow us to remain independent and continue bringing rigorous, conservative journalism to the BYU community.
      </p>
      
      <div style={{ padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', maxWidth: '600px', margin: '0 auto', border: '1px solid var(--border)' }}>
        <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--foreground)' }}>Make a Donation</h2>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[10, 25, 50, 100].map((tier) => (
            <button 
              key={tier}
              type="button"
              className={`btn ${amount === tier && !customAmount ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setAmount(tier); setCustomAmount(''); }}
              style={{ fontSize: '1.25rem', padding: '0.75rem 2rem' }}
            >
              ${tier}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Or enter a custom amount:</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>$</span>
            <input 
              type="number" 
              value={customAmount} 
              onChange={handleCustomChange}
              placeholder="Custom amount"
              className="font-sans"
              style={{ padding: '0.75rem', fontSize: '1.25rem', borderRadius: '0.25rem', border: '1px solid var(--border)', maxWidth: '200px', textAlign: 'center' }}
            />
          </div>
        </div>

        <form action="/api/stripe/checkout" method="POST">
          <input type="hidden" name="type" value="donate" />
          <input type="hidden" name="amount" value={amount} />
          <button 
            type="submit" 
            className="btn btn-primary font-sans" 
            style={{ width: '100%', fontSize: '1.25rem', padding: '1rem' }}
            disabled={!amount || amount < 1}
          >
            Donate ${amount}
          </button>
        </form>
      </div>
    </div>
  );
}

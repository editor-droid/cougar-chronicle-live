'use client';
import { useState } from 'react';
import { Lock } from 'lucide-react';

export default function DonateForm() {
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isHovered, setIsHovered] = useState<number | null>(null);

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setAmount(Number(e.target.value));
  };

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
    backgroundColor: amount === tier && !customAmount ? 'rgba(var(--accent-rgb, 0, 112, 243), 0.1)' : 'var(--background)',
    color: amount === tier && !customAmount ? 'var(--accent)' : 'var(--foreground)',
    fontWeight: amount === tier && !customAmount ? 700 : 500,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered === tier && amount !== tier ? 'translateY(-2px)' : 'none',
    boxShadow: isHovered === tier && amount !== tier ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
  });

  return (
    <div style={formStyle}>
      <h2 className="font-serif" style={{ fontSize: '1.75rem', marginBottom: '0.25rem', color: 'var(--foreground)', textAlign: 'center' }}>
        Make a Contribution
      </h2>
      <p className="font-sans text-muted" style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Select an amount to securely donate via Stripe.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[25, 50, 100, 250].map((tier) => (
          <button 
            key={tier}
            type="button"
            onMouseEnter={() => setIsHovered(tier)}
            onMouseLeave={() => setIsHovered(null)}
            style={getBtnStyle(tier)}
            onClick={() => { setAmount(tier); setCustomAmount(''); }}
          >
            ${tier}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.75rem', textAlign: 'center', fontWeight: 500 }}>
          Or enter a custom amount:
        </label>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative', maxWidth: '250px', margin: '0 auto' }}>
          <span style={{ position: 'absolute', left: '1rem', fontSize: '1.25rem', color: 'var(--muted)', fontWeight: 600 }}>$</span>
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
              fontWeight: 600
            }}
          />
        </div>
      </div>

      <form action="/api/stripe/checkout" method="POST">
        <input type="hidden" name="type" value="donate" />
        <input type="hidden" name="amount" value={amount} />
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
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          disabled={!amount || amount < 1}
          onMouseEnter={(e) => {
            if(amount >= 1) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(var(--primary-rgb, 0,0,0), 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if(amount >= 1) {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(var(--primary-rgb, 0,0,0), 0.25)';
            }
          }}
        >
          Donate ${amount || 0}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', color: 'var(--muted)' }}>
        <Lock size={16} />
        <span className="font-sans" style={{ fontSize: '0.875rem' }}>Secure checkout powered by Stripe</span>
      </div>
    </div>
  );
}

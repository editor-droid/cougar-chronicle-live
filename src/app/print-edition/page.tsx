import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Print Edition',
  description: 'Where to find physical copies of The Cougar Chronicle on campus.',
};


export default function PrintEditionPage() {
  return (
    <div style={{ padding: '6rem 2rem', textAlign: 'center', minHeight: '60vh' }}>
      <h1 className="font-serif" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Print Edition</h1>
      <p className="font-sans" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2rem auto', color: 'var(--muted)' }}>
        Subscribe to our physical print edition, delivered directly to you. High-quality conservative journalism you can hold in your hands.
      </p>
      <div style={{ padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', maxWidth: '600px', margin: '0 auto', border: '1px dashed var(--border)' }}>
        <h2 className="font-sans" style={{ marginBottom: '1rem' }}>Subscription Options Coming Soon</h2>
        <p className="font-sans text-sm text-muted">We are currently integrating Stripe to securely process your subscription payments. Check back shortly!</p>
      </div>
    </div>
  );
}

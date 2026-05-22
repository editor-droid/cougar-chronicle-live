import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Print Edition',
  description: 'Where to find physical copies of The Cougar Chronicle on campus.',
};


export default function PrintEditionPage() {
  return (
    <div style={{ padding: '6rem 2rem', textAlign: 'center', minHeight: '60vh' }}>
      <h1 className="font-serif" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Print Edition</h1>
      <p className="font-sans" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 3rem auto', color: 'var(--muted)' }}>
        Get the latest physical copy of The Cougar Chronicle delivered straight to your door, or download the digital PDF instantly.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Physical Copy */}
        <div style={{ padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--foreground)' }}>Physical Copy</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>$15.00</div>
          <p className="font-sans text-muted" style={{ marginBottom: '2rem' }}>We will mail you a high-quality physical copy of the newest edition of the paper.</p>
          
          <form action="/api/stripe/checkout" method="POST" style={{ width: '100%' }}>
            <input type="hidden" name="type" value="physical_print" />
            <button type="submit" className="btn btn-primary font-sans" style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}>
              Order Physical Copy
            </button>
          </form>
        </div>

        {/* Digital Copy */}
        <div style={{ padding: '3rem', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--foreground)' }}>Digital PDF</h2>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>$10.00</div>
          <p className="font-sans text-muted" style={{ marginBottom: '2rem' }}>Instantly download a full PDF replica of the print edition to read on your tablet or computer.</p>
          
          <form action="/api/stripe/checkout" method="POST" style={{ width: '100%' }}>
            <input type="hidden" name="type" value="digital_print" />
            <button type="submit" className="btn btn-secondary font-sans" style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}>
              Buy Digital PDF
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

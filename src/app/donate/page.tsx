export default function DonatePage() {
  return (
    <div style={{ padding: '6rem 2rem', textAlign: 'center', minHeight: '60vh' }}>
      <h1 className="font-serif" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Support The Cougar Chronicle</h1>
      <p className="font-sans" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2rem auto', color: 'var(--muted)' }}>
        Your donations allow us to remain independent and continue bringing rigorous, conservative journalism to the BYU community.
      </p>
      <div style={{ padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem', maxWidth: '600px', margin: '0 auto', border: '1px dashed var(--border)' }}>
        <h2 className="font-sans" style={{ marginBottom: '1rem' }}>Donation Portal Coming Soon</h2>
        <p className="font-sans text-sm text-muted">We are currently integrating Stripe to securely process your donations. Check back shortly!</p>
      </div>
    </div>
  );
}

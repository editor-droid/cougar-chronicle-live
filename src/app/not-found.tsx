import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <h2 className="font-serif" style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--primary)' }}>404</h2>
      <h3 className="font-serif" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page Not Found</h3>
      <p className="font-sans text-muted" style={{ marginBottom: '2rem', maxWidth: '600px' }}>
        We couldn't find the page you're looking for. It might have been moved, deleted, or never existed in the first place.
      </p>
      <Link href="/" className="btn btn-primary font-sans">
        Return Home
      </Link>
    </div>
  );
}

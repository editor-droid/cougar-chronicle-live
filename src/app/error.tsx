'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <h2 className="font-serif" style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--primary)' }}>Something went wrong!</h2>
      <p className="font-sans text-muted" style={{ marginBottom: '2rem', maxWidth: '600px' }}>
        We hit a snag while trying to load this page. Our team has been notified. 
        In the meantime, you can try reloading the page or returning to the home page.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => reset()}
          className="btn btn-primary font-sans"
        >
          Try again
        </button>
        <Link href="/" className="btn font-sans" style={{ border: '1px solid var(--border)' }}>
          Return Home
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { unsubscribeUser } from './actions';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (!email) {
    return (
      <div className="container" style={{ paddingTop: '10rem', paddingBottom: '10rem', textAlign: 'center' }}>
        <h1 className="font-serif">Invalid Request</h1>
        <p className="font-sans text-muted" style={{ marginTop: '1rem' }}>No email address was provided to unsubscribe.</p>
      </div>
    );
  }

  const handleUnsubscribe = async () => {
    setStatus('loading');
    const result = await unsubscribeUser(email);
    if (result.success) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '8rem', paddingBottom: '10rem', textAlign: 'center', maxWidth: '600px' }}>
      <h1 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Unsubscribe</h1>
      
      {status === 'idle' && (
        <>
          <p className="font-sans text-muted" style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
            Are you sure you want to unsubscribe <strong>{email}</strong> from The Cougar Chronicle newsletter? You will no longer receive daily conservative news and opinion from the BYU community.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={handleUnsubscribe}
              className="btn btn-primary font-sans"
              style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
            >
              Yes, Unsubscribe Me
            </button>
            <Link href="/" className="btn btn-secondary font-sans">
              Cancel
            </Link>
          </div>
        </>
      )}

      {status === 'loading' && (
        <p className="font-sans text-muted">Processing your request...</p>
      )}

      {status === 'success' && (
        <>
          <div style={{ color: '#16a34a', fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
          <h2 className="font-serif" style={{ marginBottom: '1rem' }}>Successfully Unsubscribed</h2>
          <p className="font-sans text-muted" style={{ marginBottom: '2rem' }}>
            <strong>{email}</strong> has been removed from our mailing list. We&apos;re sorry to see you go!
          </p>
          <p className="font-sans text-sm text-muted" style={{ marginBottom: '2rem' }}>
            Prefer to keep some emails? Sign in and use{' '}
            <Link href="/account" style={{ color: 'var(--primary)' }}>Manage preferences</Link> next time.
          </p>
          <Link href="/" className="btn btn-primary font-sans">
            Return to Homepage
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <h2 className="font-serif" style={{ color: '#dc2626', marginBottom: '1rem' }}>Something went wrong</h2>
          <p className="font-sans text-muted" style={{ marginBottom: '2rem' }}>
            We encountered an error while trying to unsubscribe you. Please try again or contact support.
          </p>
          <button onClick={() => setStatus('idle')} className="btn btn-secondary font-sans">
            Try Again
          </button>
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '10rem 0' }}>Loading...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}

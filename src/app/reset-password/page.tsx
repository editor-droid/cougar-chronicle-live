import Link from 'next/link';
import { resetPassword } from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your password.',
  openGraph: {
    title: 'Reset Password | The Cougar Chronicle',
    description: 'Reset your password.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reset Password | The Cougar Chronicle',
    description: 'Reset your password.',
    images: ['/default-og.png'],
  },
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{
    token?: string | string[];
    email?: string | string[];
    error?: string | string[];
    success?: string | string[];
  }>;
}) {
  const searchParams = await props.searchParams;
  const token = first(searchParams.token);
  const email = first(searchParams.email);
  const error = first(searchParams.error);
  const success = first(searchParams.success) === 'true';

  if (!token || !email) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '400px', marginTop: '1rem', marginBottom: '8rem', textAlign: 'center' }}>
        <h1 className="font-serif text-center" style={{ marginBottom: '1rem', fontSize: '2rem', color: 'red' }}>Invalid Link</h1>
        <p className="font-sans text-muted text-sm">This password reset link is invalid or missing required information.</p>
        <Link href="/forgot-password" className="btn btn-primary" style={{ marginTop: '2rem' }}>Request New Link</Link>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '400px', marginTop: '1rem', marginBottom: '8rem' }}>
      <h1 className="font-serif text-center" style={{ marginBottom: '1rem', fontSize: '2rem' }}>Create New Password</h1>

      {success ? (
        <div style={{ textAlign: 'center' }}>
          <p className="font-sans text-sm" style={{ color: 'green', marginBottom: '2rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '0.5rem', border: '1px solid #c8e6c9' }}>
            Your password has been successfully reset! You can now log in with your new password.
          </p>
          <Link href="/login" className="btn btn-primary">Go to Login</Link>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '0.25rem', fontSize: '0.875rem' }}>
              {error === 'invalid' && 'Invalid or expired token. Please request a new password reset.'}
              {error === 'mismatch' && 'Passwords do not match. Please try again.'}
              {error === 'error' && 'An unexpected error occurred. Please try again later.'}
            </div>
          )}

          <form
            action={resetPassword}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="email" value={email} />
            <div>
              <label className="font-sans text-sm" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>New Password</label>
              <input type="password" name="password" required minLength={8} placeholder="••••••••" />
            </div>
            <div>
              <label className="font-sans text-sm" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Confirm New Password</label>
              <input type="password" name="confirmPassword" required minLength={8} placeholder="••••••••" />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}>
              Reset Password
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

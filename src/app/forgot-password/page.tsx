import Link from 'next/link';
import { requestPasswordReset } from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your password.',
  openGraph: {
    title: 'Forgot Password | The Cougar Chronicle',
    description: 'Reset your password.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forgot Password | The Cougar Chronicle',
    description: 'Reset your password.',
    images: ['/default-og.png'],
  },
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default async function ForgotPasswordPage(props: {
  searchParams: Promise<{ sent?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const isSent = first(searchParams.sent) === 'true';

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '400px', marginTop: '1rem', marginBottom: '8rem' }}>
      <h1 className="font-serif text-center" style={{ marginBottom: '1rem', fontSize: '2rem' }}>Reset Password</h1>
      <p className="font-sans text-muted text-center text-sm" style={{ marginBottom: '2rem' }}>
        {isSent
          ? "If an account with that email exists, we have sent a secure password reset link. Please check your inbox."
          : "Enter the email address associated with your account, and we will send you a secure link to reset your password."}
      </p>

      {!isSent && (
        <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
          <form
            action={requestPasswordReset}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            <div>
              <label className="font-sans text-sm" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email Address</label>
              <input type="email" name="email" placeholder="your-email@example.com" required />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}>
              Send Reset Link
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link href="/login" className="font-sans text-sm text-muted" style={{ textDecoration: 'underline' }}>
              &larr; Back to Login
            </Link>
          </div>
        </div>
      )}

      {isSent && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/login" className="btn btn-secondary">
            Return to Login
          </Link>
        </div>
      )}
    </div>
  );
}

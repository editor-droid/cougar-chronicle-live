import Link from 'next/link';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

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


export default function ForgotPasswordPage({ searchParams }: { searchParams?: { sent?: string } }) {
  const isSent = searchParams?.sent === 'true';

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
            action={async (formData) => {
              'use server';
              const email = formData.get('email') as string;
              if (email) {
                // 1. Check if user exists
                const user = await prisma.user.findUnique({ where: { email } });
                
                if (user) {
                  // 2. Generate secure token
                  const token = randomBytes(32).toString('hex');
                  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
                  
                  // 3. Save to database
                  // Delete any existing tokens for this email first
                  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
                  await prisma.verificationToken.create({
                    data: {
                      identifier: email,
                      token,
                      expires
                    }
                  });

                  // 4. Send email using Resend
                  const resend = new Resend(process.env.RESEND_API_KEY);
                  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
                  
                  await resend.emails.send({
                    from: 'The Cougar Chronicle <noreply@updates.thecougarchronicle.com>',
                    to: email,
                    subject: 'Reset your password - The Cougar Chronicle',
                    html: `
                      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                        <h2 style="color: #1B2253;">Password Reset Request</h2>
                        <p>We received a request to reset the password for your Cougar Chronicle account.</p>
                        <p>Click the secure link below to choose a new password. This link will expire in 1 hour.</p>
                        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1B2253; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Reset My Password</a>
                        <p style="margin-top: 25px; font-size: 12px; color: #666;">If you did not request this, please ignore this email.</p>
                      </div>
                    `
                  }).catch(e => console.error("Resend Error:", e));
                }
              }
              const { redirect } = await import('next/navigation');
              redirect('/forgot-password?sent=true');
            }}
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

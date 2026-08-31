'use server';

import { randomBytes } from 'crypto';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { sendOneEmail } from '@/lib/email';

function publicSiteOrigin(): string {
  const candidates = [
    process.env.NEXTAUTH_URL,
    process.env.AUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const url = new URL(raw);
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (isLocal && process.env.NODE_ENV === 'production') continue;
      return url.origin;
    } catch {
      // ignore malformed env values
    }
  }
  return 'https://thecougarchronicle.com';
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase();

  if (email) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (user?.email) {
      const identifier = user.email.trim().toLowerCase();
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

      await prisma.verificationToken.deleteMany({ where: { identifier } });
      await prisma.verificationToken.create({
        data: { identifier, token, expires },
      });

      const resetUrl = `${publicSiteOrigin()}/reset-password?token=${token}&email=${encodeURIComponent(identifier)}`;

      await sendOneEmail({
        from: 'The Cougar Chronicle <noreply@updates.thecougarchronicle.com>',
        to: identifier,
        subject: 'Reset your password - The Cougar Chronicle',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #1B2253;">Password Reset Request</h2>
            <p>We received a request to reset the password for your Cougar Chronicle account.</p>
            <p>Click the secure link below to choose a new password. This link will expire in 1 hour.</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1B2253; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Reset My Password</a>
            <p style="margin-top: 25px; font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br/>${resetUrl}</p>
            <p style="margin-top: 25px; font-size: 12px; color: #666;">If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
    }
  }

  redirect('/forgot-password?sent=true');
}

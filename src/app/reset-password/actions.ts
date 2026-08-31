'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

function resetPath(
  email: string,
  token: string,
  extra?: Record<string, string>
) {
  const params = new URLSearchParams({ token, email, ...extra });
  return `/reset-password?${params.toString()}`;
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get('token') || '');
  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  if (!token || !email) {
    redirect('/reset-password');
  }

  if (password !== confirmPassword) {
    redirect(resetPath(email, token, { error: 'mismatch' }));
  }

  if (password.length < 8) {
    redirect(resetPath(email, token, { error: 'error' }));
  }

  const dbToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      identifier: { equals: email, mode: 'insensitive' },
    },
  });

  if (!dbToken || dbToken.expires < new Date()) {
    redirect(resetPath(email, token, { error: 'invalid' }));
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  if (!user) {
    redirect(resetPath(email, token, { error: 'invalid' }));
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
    await prisma.verificationToken.deleteMany({
      where: { token, identifier: dbToken.identifier },
    });
  } catch (e) {
    console.error('reset password failed', e);
    redirect(resetPath(email, token, { error: 'error' }));
  }

  redirect(resetPath(email, token, { success: 'true' }));
}

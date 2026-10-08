'use server';

import { Resend } from 'resend';
import prisma from '@/lib/prisma';
import { isMarketingConfigured, marketingApiKey } from '@/lib/email';

export async function unsubscribeUser(email: string) {
  if (!email) return { error: 'Email is required' };

  try {
    // 1. Update Database
    await prisma.subscriber.update({
      where: { email },
      data: { isActive: false },
    });
  } catch (error) {
    console.error('Failed to update subscriber in DB:', error);
    // Ignore error if subscriber not found
  }

  // 2. Stop marketing broadcasts. List sends also drop inactive subscribers on the next sync.
  if (isMarketingConfigured()) {
    try {
      const updated = await new Resend(marketingApiKey()).contacts.update({ email, unsubscribed: true });
      if (updated.error && updated.error.name !== 'not_found') {
        console.error('Failed to unsubscribe Resend contact:', updated.error.message);
      }
    } catch (error) {
      console.error('Failed to unsubscribe Resend contact:', error);
    }
  }

  return { success: true };
}

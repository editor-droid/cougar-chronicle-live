'use server';

import prisma from '@/lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '993e7864-bb3a-4543-a437-a7848b030657';

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

  // 2. Remove from Resend
  if (process.env.RESEND_API_KEY) {
    try {
      // Find the contact in the audience
      const contacts = await resend.contacts.list({ audienceId: AUDIENCE_ID });
      const contact = contacts.data?.data?.find(c => c.email === email);
      
      if (contact) {
        await resend.contacts.remove({
          id: contact.id,
          audienceId: AUDIENCE_ID,
        });
      }
    } catch (error) {
      console.error('Failed to remove from Resend audience:', error);
    }
  }

  return { success: true };
}

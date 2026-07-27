'use server'

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateFundraiserGoal(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') throw new Error('Unauthorized');

  const goalStr = formData.get('goal') as string;
  const goal = parseInt(goalStr, 10) || 0;

  await prisma.siteSetting.upsert({
    where: { key: 'fundraiserGoal' },
    update: { value: goal.toString() },
    create: { key: 'fundraiserGoal', value: goal.toString() }
  });

  revalidatePath('/dashboard/donors');
  revalidatePath('/donate');
  revalidatePath('/fundraiser');
}

/** Manually record a donation (offline gift, check, etc.). */
export async function addManualDonation(data: {
  name?: string;
  email?: string;
  amount: number;
  note?: string;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') throw new Error('Unauthorized');

  const amount = Number(data.amount);
  if (!amount || amount <= 0) throw new Error('Amount must be greater than 0');

  await prisma.donation.create({
    data: {
      name: (data.name || '').trim() || 'Anonymous',
      email: (data.email || '').trim() || 'manual@thecougarchronicle.com',
      amount,
      // store note in email suffix? Donation model may not have note - check schema
    },
  });

  revalidatePath('/dashboard/donors');
  revalidatePath('/fundraiser');
  return { ok: true as const };
}

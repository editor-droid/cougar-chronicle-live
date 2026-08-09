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
  campaign?: string;
  sourceDetail?: string;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') throw new Error('Unauthorized');

  const amount = Number(data.amount);
  if (!amount || amount <= 0) throw new Error('Amount must be greater than 0');

  const campaign = (data.campaign || 'general').trim() || 'general';

  await prisma.donation.create({
    data: {
      name: (data.name || '').trim() || 'Anonymous',
      email: (data.email || '').trim() || 'manual@thecougarchronicle.com',
      amount,
      campaign,
      source: 'manual',
      sourceDetail: (data.sourceDetail || '').trim() || null,
    },
  });

  revalidatePath('/dashboard/donors');
  revalidatePath('/fundraiser');
  revalidatePath('/dashboard/analytics');
  return { ok: true as const };
}

'use server'

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { refresh, revalidatePath } from 'next/cache';
import { parseGoalDollars } from '@/lib/donations';
import { setFundraiserGoal } from '@/lib/fundraiser-goal';

export async function updateFundraiserGoal(rawGoal: string | number) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const goal = parseGoalDollars(rawGoal);
  if (goal == null) {
    throw new Error('Enter a whole-dollar goal of at least $1');
  }

  await setFundraiserGoal(goal);

  revalidatePath('/dashboard/donors');
  revalidatePath('/donate');
  revalidatePath('/fundraiser');
  refresh();

  return { ok: true as const, goal };
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

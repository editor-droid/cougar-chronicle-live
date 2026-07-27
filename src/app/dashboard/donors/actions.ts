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

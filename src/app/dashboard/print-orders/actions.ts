'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function markPrintOrderFulfilled(formData: FormData) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    throw new Error('Unauthorized');
  }
  const id = formData.get('id') as string;
  if (!id) return;
  await prisma.printPurchase.update({
    where: { id },
    data: { fulfilled: true },
  });
  revalidatePath('/dashboard/print-orders');
}

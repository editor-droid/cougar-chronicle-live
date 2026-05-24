'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function toggleNewsletter(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) return { error: 'Unauthorized' };
  
  const email = session.user.email;
  const wantsNewsletter = formData.get('subscribe') === 'true';

  try {
    const existing = await prisma.subscriber.findUnique({
      where: { email }
    });

    if (existing) {
      await prisma.subscriber.update({
        where: { email },
        data: { isActive: wantsNewsletter }
      });
    } else if (wantsNewsletter) {
      await prisma.subscriber.create({
        data: {
          email,
          name: session.user.name || undefined,
          isActive: true
        }
      });
    }

    revalidatePath('/account');
    return { success: true };
  } catch (error) {
    console.error('Error toggling newsletter:', error);
    return { error: 'Failed to update preferences.' };
  }
}

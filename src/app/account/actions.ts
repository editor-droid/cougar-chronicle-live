'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function toggleNewsletter(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) return;
  
  const email = session.user.email;
  const wantsNews = formData.get('wantsNews') === 'on';
  const wantsFaith = formData.get('wantsFaith') === 'on';
  const wantsOpinion = formData.get('wantsOpinion') === 'on';
  const wantsVideos = formData.get('wantsVideos') === 'on';
  const wantsDigest = formData.get('wantsDigest') === 'on';
  const wantsInstant = formData.get('wantsInstant') === 'on';
  const wantsBreaking = formData.get('wantsBreaking') === 'on';
  // If any category is selected, they are considered "active"
  const isActive =
    wantsNews || wantsFaith || wantsOpinion || wantsVideos || wantsDigest || wantsInstant || wantsBreaking;

  try {
    const existing = await prisma.subscriber.findUnique({
      where: { email }
    });

    if (existing) {
      await prisma.subscriber.update({
        where: { email },
        data: {
          isActive,
          wantsNews,
          wantsFaith,
          wantsOpinion,
          wantsVideos,
          wantsDigest,
          wantsInstant,
          wantsBreaking,
        }
      });
    } else if (isActive) {
      await prisma.subscriber.create({
        data: {
          email,
          name: session.user.name || undefined,
          isActive,
          wantsNews,
          wantsFaith,
          wantsOpinion,
          wantsVideos,
          wantsDigest,
          wantsInstant,
          wantsBreaking,
        }
      });
    }

    revalidatePath('/account');
  } catch (error) {
    console.error('Error toggling newsletter:', error);
  }
}

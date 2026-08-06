'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function requireStaff() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function setPostPrintEdition(data: {
  postId: string;
  printEditionId: string | null;
  printEditionOrder?: number | null;
}) {
  await requireStaff();
  await prisma.post.update({
    where: { id: data.postId },
    data: {
      printEditionId: data.printEditionId,
      printEditionOrder:
        data.printEditionId == null
          ? null
          : data.printEditionOrder != null
            ? data.printEditionOrder
            : undefined,
    },
  });
  revalidatePath('/dashboard/print-editions');
  if (data.printEditionId) {
    revalidatePath(`/dashboard/print-editions/${data.printEditionId}`);
  }
  revalidatePath('/dashboard');
  return { ok: true as const };
}

export async function updatePostPrintOrder(data: {
  postId: string;
  printEditionOrder: number | null;
}) {
  await requireStaff();
  await prisma.post.update({
    where: { id: data.postId },
    data: { printEditionOrder: data.printEditionOrder },
  });
  revalidatePath('/dashboard/print-editions');
  return { ok: true as const };
}

/** Create a new draft already linked to a print volume, then open the editor. */
export async function createDraftForPrintEdition(printEditionId: string) {
  const session = await requireStaff();

  const edition = await prisma.printEdition.findUnique({
    where: { id: printEditionId },
    select: { id: true, title: true },
  });
  if (!edition) throw new Error('Print edition not found');

  const agg = await prisma.post.aggregate({
    where: { printEditionId },
    _max: { printEditionOrder: true },
  });
  const nextOrder = (agg._max.printEditionOrder ?? 0) + 1;

  const baseSlug = `print-draft-${Date.now().toString(36)}`;
  const post = await prisma.post.create({
    data: {
      title: 'Untitled print article',
      slug: baseSlug,
      category: 'campus',
      format: 'news',
      content: '<p></p>',
      state: 'DRAFT',
      authorId: session.user.id,
      printEditionId,
      printEditionOrder: nextOrder,
      isPremium: true,
    },
  });

  revalidatePath('/dashboard/print-editions');
  revalidatePath(`/dashboard/print-editions/${printEditionId}`);
  revalidatePath('/dashboard');
  return { postId: post.id };
}

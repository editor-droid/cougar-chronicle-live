'use server'

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PostState } from '@prisma/client';

export async function updatePostState(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const postId = formData.get('postId') as string;
  const newState = formData.get('newState') as PostState;
  
  if (!postId || !newState) throw new Error('Missing fields');

  const role = session.user.role;
  
  // Basic RBAC check for state transitions
  if (newState === 'APPROVED' || newState === 'PUBLISHED') {
    if (role !== 'EDITOR' && role !== 'ADMIN') {
      throw new Error('Only editors can approve or publish');
    }
  }

  await prisma.post.update({
    where: { id: postId },
    data: { state: newState }
  });

  revalidatePath('/dashboard');
  revalidatePath('/');
}

export async function savePost(data: any) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  if (data.id) {
    await prisma.post.update({
      where: { id: data.id },
      data: {
        title: data.title,
        slug: data.slug,
        category: data.category,
        content: data.content,
      }
    });
  } else {
    await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        category: data.category,
        content: data.content,
        authorId: data.authorId,
        state: 'DRAFT'
      }
    });
  }

  revalidatePath('/dashboard');
}

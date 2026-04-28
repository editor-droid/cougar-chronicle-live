'use server'

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PostState, Role } from '@prisma/client';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_fallback_key_so_build_does_not_crash');

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

  // Fetch the post before update to get author details
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: true }
  });

  if (!post) throw new Error('Post not found');

  await prisma.post.update({
    where: { id: postId },
    data: { state: newState }
  });

  // Handle email notifications based on state transitions
  try {
    if (newState === 'IN_REVIEW' && post.state === 'DRAFT') {
      const editors = await prisma.user.findMany({
        where: { role: { in: ['EDITOR', 'ADMIN'] } }
      });
      const editorEmails = editors.map(e => e.email).filter(Boolean) as string[];
      
      if (editorEmails.length > 0) {
        await resend.emails.send({
          from: 'notifications@thecougarchronicle.com',
          to: editorEmails,
          subject: `New Draft Needs Review: ${post.title}`,
          html: `<p>A new draft "<strong>${post.title}</strong>" by ${post.author.name || 'a writer'} has been submitted for review.</p><p><a href="https://thecougarchronicle.com/dashboard/editor/${post.id}">Review it here</a></p>`
        });
      }
    } else if (newState === 'APPROVED' && post.state === 'IN_REVIEW') {
      if (post.author.email) {
        await resend.emails.send({
          from: 'notifications@thecougarchronicle.com',
          to: post.author.email,
          subject: `Your draft was approved: ${post.title}`,
          html: `<p>Great news! Your draft "<strong>${post.title}</strong>" has been approved by an editor and is ready to be published.</p>`
        });
      }
    } else if (newState === 'PUBLISHED' && post.state === 'APPROVED') {
      if (post.author.email) {
        await resend.emails.send({
          from: 'notifications@thecougarchronicle.com',
          to: post.author.email,
          subject: `Your post is now live: ${post.title}`,
          html: `<p>Congratulations! Your post "<strong>${post.title}</strong>" has been published.</p><p><a href="https://thecougarchronicle.com/article/${post.slug}">View it live here</a></p>`
        });
      }
    }
  } catch (error) {
    console.error("Failed to send notification email", error);
  }

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

export async function updateUserRole(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only admins can manage users');
  }

  const userId = formData.get('userId') as string;
  const newRole = formData.get('role') as Role;

  if (!userId || !newRole) throw new Error('Missing fields');

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole }
  });

  revalidatePath('/dashboard/users');
}

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
    const isMock = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('fallback');
    
    if (newState === 'IN_REVIEW' && post.state === 'DRAFT') {
      const editors = await prisma.user.findMany({
        where: { role: { in: ['EDITOR', 'ADMIN'] } }
      });
      const editorEmails = editors.map(e => e.email).filter(Boolean) as string[];
      
      if (editorEmails.length > 0) {
        const subject = `New Draft Needs Review: ${post.title}`;
        const html = `<p>A new draft "<strong>${post.title}</strong>" by ${post.author.name || 'a writer'} has been submitted for review.</p><p><a href="https://thecougarchronicle.com/dashboard/editor/${post.id}">Review it here</a></p>`;
        
        console.log(`\n=========================================\n[EMAIL NOTIFICATION] Submission for Review\nTo: ${editorEmails.join(', ')}\nSubject: ${subject}\n=========================================\n`);
        
        if (!isMock) {
          await resend.emails.send({
            from: 'notifications@thecougarchronicle.com',
            to: editorEmails,
            subject,
            html
          });
        }
      }
    } else if (newState === 'APPROVED' && post.state === 'IN_REVIEW') {
      if (post.author.email) {
        const subject = `Your draft was approved: ${post.title}`;
        const html = `<p>Great news! Your draft "<strong>${post.title}</strong>" has been approved by an editor and is ready to be published.</p>`;
        
        console.log(`\n=========================================\n[EMAIL NOTIFICATION] Approval\nTo: ${post.author.email}\nSubject: ${subject}\n=========================================\n`);

        if (!isMock) {
          await resend.emails.send({
            from: 'notifications@thecougarchronicle.com',
            to: post.author.email,
            subject,
            html
          });
        }
      }
    } else if (newState === 'PUBLISHED' && post.state === 'APPROVED') {
      if (post.author.email) {
        const subject = `Your post is now live: ${post.title}`;
        const html = `<p>Congratulations! Your post "<strong>${post.title}</strong>" has been published.</p><p><a href="https://thecougarchronicle.com/article/${post.slug}">View it live here</a></p>`;
        
        console.log(`\n=========================================\n[EMAIL NOTIFICATION] Publication\nTo: ${post.author.email}\nSubject: ${subject}\n=========================================\n`);

        if (!isMock) {
          await resend.emails.send({
            from: 'notifications@thecougarchronicle.com',
            to: post.author.email,
            subject,
            html
          });
        }
      }

      // BROADCAST TO SUBSCRIBERS
      try {
        const pastPosts = await prisma.post.findMany({
          where: { state: 'PUBLISHED', id: { not: post.id } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });

        const excerpt = post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...' : 'Read our latest article.';
        const origin = process.env.NEXTAUTH_URL || 'https://cougar-chronicle-live-production-c994.up.railway.app';
        const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '993e7864-bb3a-4543-a437-a7848b030657';

        let pastPostsHtml = '';
        if (pastPosts.length > 0) {
          pastPostsHtml = `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E3D8;">
              <h3 style="color: #1B2253; font-family: Georgia, serif;">Recent Stories</h3>
              <ul style="list-style: none; padding: 0;">
                ${pastPosts.map(p => `
                  <li style="margin-bottom: 15px;">
                    <a href="${origin}/article/${p.slug}" style="color: #1B2253; text-decoration: none; font-weight: bold; font-family: Georgia, serif; font-size: 16px;">${p.title}</a>
                  </li>
                `).join('')}
              </ul>
            </div>
          `;
        }

        const broadcastHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1B2253; font-family: Georgia, serif; font-size: 32px; letter-spacing: -0.05em; text-transform: uppercase;">The Cougar Chronicle</h1>
            </div>
            
            <h2 style="font-family: Georgia, serif; font-size: 24px; color: #1A1A1A; line-height: 1.3;">
              <a href="${origin}/article/${post.slug}" style="color: #1A1A1A; text-decoration: none;">${post.title}</a>
            </h2>
            <p style="color: #6B7280; font-size: 14px; font-weight: bold; text-transform: uppercase;">By ${post.author.name}</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #444;">${excerpt}</p>
            
            <div style="margin-top: 25px;">
              <a href="${origin}/article/${post.slug}" style="display: inline-block; background-color: #1B2253; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Read Full Article</a>
            </div>

            ${pastPostsHtml}

            <hr style="border: none; border-top: 1px solid #eaeaea; margin-top: 40px; margin-bottom: 20px;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              You are receiving this because you subscribed to The Cougar Chronicle. 
            </p>
          </div>
        `;

        console.log(`\n=========================================\n[BROADCAST NOTIFICATION] Triggering Audience Broadcast\nAudience ID: ${AUDIENCE_ID}\nSubject: New Post: ${post.title}\n=========================================\n`);

        if (!isMock) {
          await resend.broadcasts.create({
            audienceId: AUDIENCE_ID,
            name: `Broadcast: ${post.title}`,
            from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
            subject: `New Post: ${post.title}`,
            html: broadcastHtml,
          });
        }
      } catch (broadcastError) {
        console.error('Failed to trigger broadcast:', broadcastError);
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
        imageUrl: data.imageUrl,
      }
    });
  } else {
    await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        category: data.category,
        content: data.content,
        imageUrl: data.imageUrl,
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

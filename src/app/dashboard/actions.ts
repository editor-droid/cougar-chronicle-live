'use server'

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PostState, Role } from '@prisma/client';
import { Resend } from 'resend';
import { getArticleUrl } from '@/lib/routes';

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

  // Strict ownership and role check
  if (role !== 'EDITOR' && role !== 'ADMIN') {
    if (role !== 'WRITER') throw new Error('Unauthorized role');
    if (post.authorId !== session.user.id) throw new Error('You can only modify your own posts');
  }

  const updateData: any = { state: newState };
  if (newState === 'PUBLISHED') {
    if (!post.publishedAt) {
      updateData.publishedAt = new Date();
    }
    
    // Auto-generate missing SEO and Key Insights if they weren't manually set
    if (!post.keyInsights || !post.seoTitle) {
      try {
        const { generateObject } = await import('ai');
        const { google } = await import('@ai-sdk/google');
        const { z } = await import('zod');
        
        const cleanContent = (post.content || '').replace(/<[^>]*>?/gm, ' ');
        const result = await generateObject({
          model: google('gemini-3.5-flash'),
          schema: z.object({
            seoTitle: z.string(),
            seoDescription: z.string(),
            seoKeywords: z.string(),
            featuredImageAlt: z.string(),
            keyInsights: z.string()
          }),
          prompt: `You are an expert SEO specialist with 20 years of experience in digital publishing. 
          Analyze the following article draft and generate perfectly optimized SEO metadata.
          For keyInsights, return an HTML unordered list (<ul>) with 3 concise bullet points (<li>) summarizing the most important takeaways. Do NOT use markdown.

          Current Headline: ${post.title || 'Untitled'}
          
          Article Content:
          ${cleanContent.substring(0, 5000)}`
        });
        
        if (!post.seoTitle) updateData.seoTitle = result.object.seoTitle;
        if (!post.seoDescription) updateData.seoDescription = result.object.seoDescription;
        if (!post.seoKeywords) updateData.seoKeywords = result.object.seoKeywords;
        if (!post.featuredImageAlt) updateData.featuredImageAlt = result.object.featuredImageAlt;
        if (!post.keyInsights) updateData.keyInsights = result.object.keyInsights;
      } catch (e) {
        console.error('Auto-generate SEO failed:', e);
      }
    }
  }

  await prisma.post.update({
    where: { id: postId },
    data: updateData
  });

  // Handle email notifications based on state transitions
  try {
    const isMock = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('fallback');
    
    if (newState === 'IN_REVIEW' && post.state === 'DRAFT') {
      // Mark all outstanding notes as resolved since the writer is resubmitting
      await prisma.editorialNote.updateMany({
        where: { postId, resolved: false },
        data: { resolved: true }
      });

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
        const html = `<p>Congratulations! Your post "<strong>${post.title}</strong>" has been published.</p><p><a href="https://thecougarchronicle.com${getArticleUrl(post)}">View it live here</a></p>`;
        
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
        const origin = process.env.NEXTAUTH_URL || (process.env.NEXTAUTH_URL || 'http://localhost:3000');
        const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '993e7864-bb3a-4543-a437-a7848b030657';

        let pastPostsHtml = '';
        if (pastPosts.length > 0) {
          pastPostsHtml = `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E3D8;">
              <h3 style="color: #1B2253; font-family: Georgia, serif;">Recent Stories</h3>
              <ul style="list-style: none; padding: 0;">
                ${pastPosts.map(p => `
                  <li style="margin-bottom: 15px;">
                    <a href="${origin}${getArticleUrl(p)}" style="color: #1B2253; text-decoration: none; font-weight: bold; font-family: Georgia, serif; font-size: 16px;">${p.title}</a>
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
              <a href="${origin}${getArticleUrl(post)}" style="color: #1A1A1A; text-decoration: none;">${post.title}</a>
            </h2>
            <p style="color: #6B7280; font-size: 14px; font-weight: bold; text-transform: uppercase;">By ${post.author.name}</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #444;">${excerpt}</p>
            
            <div style="margin-top: 25px;">
              <a href="${origin}${getArticleUrl(post)}" style="display: inline-block; background-color: #1B2253; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Read Full Article</a>
            </div>

            ${pastPostsHtml}

            <hr style="border: none; border-top: 1px solid #eaeaea; margin-top: 40px; margin-bottom: 20px;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              You are receiving this because you subscribed to The Cougar Chronicle. 
            </p>
          </div>
        `;

        console.log(`\n=========================================\n[BROADCAST NOTIFICATION] Triggering Batched Email\nCategory: ${post.category}\nSubject: New Post: ${post.title}\n=========================================\n`);

        if (!isMock) {
          const whereClause: any = { isActive: true };
          if (post.category === 'news') whereClause.wantsNews = true;
          else if (post.category === 'faith') whereClause.wantsFaith = true;
          else if (post.category === 'opinion') whereClause.wantsOpinion = true;

          const subscribers = await prisma.subscriber.findMany({
            where: whereClause,
            select: { email: true }
          });
          const emails = subscribers.map(s => s.email);

          if (emails.length > 0) {
            const CHUNK_SIZE = 100;
            for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
              const chunk = emails.slice(i, i + CHUNK_SIZE);
              const payloads = chunk.map(email => ({
                from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
                to: email,
                subject: `New Post: ${post.title}`,
                html: broadcastHtml
              }));
              await resend.batch.send(payloads);
            }
            console.log(`Successfully sent to ${emails.length} subscribers.`);
          } else {
            console.log('No subscribers opted into this category.');
          }
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

  const role = session.user.role;
  if (role !== 'EDITOR' && role !== 'ADMIN' && role !== 'WRITER') {
    throw new Error('Unauthorized role');
  }

  if (data.id) {
    const existing = await prisma.post.findUnique({ where: { id: data.id } });
    if (!existing) throw new Error('Post not found');
    
    if (role === 'WRITER' && existing.authorId !== session.user.id) {
      throw new Error('You can only edit your own posts');
    }

    await prisma.post.update({
      where: { id: data.id },
      data: {
        title: data.title,
        slug: data.slug,
        category: data.category,
        content: data.content,
        imageUrl: data.imageUrl,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,
        keyInsights: data.keyInsights,
        featuredImageAlt: data.featuredImageAlt,
        customAuthor: data.customAuthor,
        authorId: role === 'WRITER' ? session.user.id : data.authorId, // Ensure WRITERs can't reassign
        isPremium: data.isPremium !== undefined ? data.isPremium : false,
        printEditionOrder: data.printEditionOrder ? parseInt(data.printEditionOrder) : null,
        imageCaption: data.imageCaption
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
        authorId: role === 'WRITER' ? session.user.id : data.authorId, // Ensure WRITERs can't assign to others
        state: 'DRAFT',
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoKeywords: data.seoKeywords,
        keyInsights: data.keyInsights,
        featuredImageAlt: data.featuredImageAlt,
        customAuthor: data.customAuthor,
        isPremium: data.isPremium !== undefined ? data.isPremium : false,
        printEditionOrder: data.printEditionOrder ? parseInt(data.printEditionOrder) : null,
        imageCaption: data.imageCaption
      }
    });
  }

  revalidatePath('/dashboard');
}

export async function updateUser(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only admins can manage users');
  }

  const userId = formData.get('userId') as string;
  const newRole = formData.get('role') as Role;
  const newEmail = formData.get('email') as string;

  if (!userId) throw new Error('Missing fields');

  await prisma.user.update({
    where: { id: userId },
    data: { 
      ...(newRole && { role: newRole }),
      ...(newEmail && { email: newEmail })
    }
  });

  revalidatePath('/dashboard/users');
}

export async function addEditorialNote(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  const role = session.user.role;
  const isEditorOrAdmin = role === 'EDITOR' || role === 'ADMIN';

  const postId = formData.get('postId') as string;
  const content = formData.get('content') as string;
  const requestChanges = formData.get('requestChanges') === 'true';

  if (!postId || !content) throw new Error('Missing fields');

  // Find the post and author
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: true }
  });

  if (!post) throw new Error('Post not found');

  // Writers can only reply to notes on their own posts
  if (!isEditorOrAdmin && post.authorId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  // Create the note
  await prisma.editorialNote.create({
    data: {
      content,
      postId,
      authorId: session.user.id,
    }
  });

  // If editor requests changes, move back to DRAFT
  if (isEditorOrAdmin && requestChanges && post.state === 'IN_REVIEW') {
    await prisma.post.update({
      where: { id: postId },
      data: { state: 'DRAFT' }
    });

    // Email the writer
    if (post.author.email) {
      const isMock = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('fallback');
      const subject = `Changes Requested: ${post.title}`;
      const origin = process.env.NEXTAUTH_URL || (process.env.NEXTAUTH_URL || 'http://localhost:3000');
      const html = `
        <p>An editor has reviewed your draft "<strong>${post.title}</strong>" and requested some changes.</p>
        <p><strong>Editor's Note:</strong></p>
        <blockquote style="border-left: 4px solid #1B2253; padding-left: 15px; color: #444; font-style: italic;">
          ${content.replace(/\\n/g, '<br/>')}
        </blockquote>
        <p><a href="${origin}/dashboard/editor/${post.id}">Click here to view your dashboard and make the changes.</a></p>
      `;

      if (!isMock) {
        try {
          await resend.emails.send({
            from: 'notifications@thecougarchronicle.com',
            to: post.author.email,
            subject,
            html
          });
        } catch (e) {
          console.error("Failed to email writer about requested changes", e);
        }
      }
    }
  }

  revalidatePath(`/dashboard/editor/${postId}`);
}

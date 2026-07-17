'use server'

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PostState, Role } from '@prisma/client';
import { Resend } from 'resend';
import { getArticleUrl } from '@/lib/routes';
import { broadcastPostPublication } from '@/lib/publish-utils';
import { syncArticleVideosToLibrary } from '@/lib/article-videos';
import { canApprovePosts, canPublishPosts } from '@/lib/roles';
import { computeBreakingUntil, DEFAULT_BREAKING_HOURS } from '@/lib/breaking';

const resend = new Resend(process.env.RESEND_API_KEY || 're_fallback_key_so_build_does_not_crash');

/** Create /videos library entries for Stream+YouTube embeds in published posts. */
async function maybeSyncArticleVideos(post: {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  state: string;
  seoDescription?: string | null;
  seoTitle?: string | null;
  seoKeywords?: string | null;
  publishedAt?: Date | null;
  createdAt?: Date;
  isPremium?: boolean;
  printEditionId?: string | null;
}) {
  if (post.state !== 'PUBLISHED') return;
  try {
    const result = await syncArticleVideosToLibrary(post);
    if (result.created > 0) {
      revalidatePath('/videos');
      revalidatePath('/');
      console.log(
        `[article-videos] post=${post.id} created=${result.created} existing=${result.existing}`
      );
    }
  } catch (e) {
    console.error('[article-videos] sync failed', e);
  }
}

export async function updatePostState(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const postId = formData.get('postId') as string;
  const newState = formData.get('newState') as PostState;
  
  if (!postId || !newState) throw new Error('Missing fields');

  const role = session.user.role;
  
  // RBAC: editors approve; only admins publish live
  if (newState === 'PUBLISHED') {
    if (!canPublishPosts(role)) {
      throw new Error('Only admins can publish posts');
    }
  }
  if (newState === 'APPROVED') {
    if (!canApprovePosts(role)) {
      throw new Error('Only editors or admins can approve posts');
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

    // Start (or backfill) the breaking window at publish so the banner actually expires.
    // Save already sets breakingUntil when possible; this covers null/legacy rows.
    if (post.isBreaking) {
      const until = post.breakingUntil ? new Date(post.breakingUntil) : null;
      if (!until || until.getTime() <= Date.now()) {
        updateData.breakingUntil = computeBreakingUntil(DEFAULT_BREAKING_HOURS);
      }
    }
    
    // Auto-generate missing SEO and Key Insights if they weren't manually set
    if (!post.keyInsights || !post.seoTitle) {
      try {
        const { z } = await import('zod');
        const {
          generateStructured,
          insightsToHtml,
          stripHtmlForPrompt,
        } = await import('@/lib/ai');

        const cleanContent = stripHtmlForPrompt(post.content || '', 6000);
        const result = await generateStructured({
          schema: z.object({
            seoTitle: z.string(),
            seoDescription: z.string(),
            seoKeywords: z.string(),
            featuredImageAlt: z.string(),
            keyInsights: z.array(z.string()).min(2).max(5),
          }),
          prompt: `You are the SEO editor for The Cougar Chronicle (independent conservative student journalism at BYU).
Analyze this article and produce SEO metadata. keyInsights must be 2–4 plain-text takeaway bullets (no HTML).

Current Headline: ${post.title || 'Untitled'}

Article Content:
${cleanContent}`,
        });

        if (!post.seoTitle) updateData.seoTitle = result.seoTitle.trim().slice(0, 70);
        if (!post.seoDescription) {
          updateData.seoDescription = result.seoDescription.trim().slice(0, 200);
        }
        if (!post.seoKeywords) {
          updateData.seoKeywords = result.seoKeywords.trim().replace(/\s*,\s*/g, ', ').slice(0, 300);
        }
        if (!post.featuredImageAlt) {
          updateData.featuredImageAlt = result.featuredImageAlt.trim().slice(0, 200);
        }
        if (!post.keyInsights) {
          updateData.keyInsights = insightsToHtml(result.keyInsights);
        }
      } catch (e) {
        console.error('Auto-generate SEO failed:', e);
      }
    }
  }

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: updateData
  });

  if (newState === 'PUBLISHED') {
    await maybeSyncArticleVideos({
      ...post,
      ...updatedPost,
      content: updatedPost.content ?? post.content,
      seoDescription: updatedPost.seoDescription ?? post.seoDescription,
      seoTitle: updatedPost.seoTitle ?? post.seoTitle,
      seoKeywords: updatedPost.seoKeywords ?? post.seoKeywords,
      state: 'PUBLISHED',
    });
  }

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
    } else if (newState === 'PUBLISHED' && post.state !== 'PUBLISHED') {
      // Fire for ANY first publish (DRAFT/IN_REVIEW/APPROVED → PUBLISHED).
      // Previously only APPROVED→PUBLISHED emailed, so editor "Publish" from draft skipped everyone.
      await broadcastPostPublication({ ...post, author: post.author });
    }
  } catch (error) {
    console.error("Failed to send notification email", error);
  }

  revalidatePath('/dashboard');
  revalidatePath('/');
}

function slugifyTitle(title: string): string {
  const base = String(title || 'post')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'post';
}

async function ensureUniqueSlug(desired: string, excludeId?: string): Promise<string> {
  let base = slugifyTitle(desired);
  if (!base) base = 'post';
  let slug = base;
  let n = 0;
  while (true) {
    const existing = await prisma.post.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function savePost(data: any) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const role = session.user.role;
  if (role !== 'EDITOR' && role !== 'ADMIN' && role !== 'WRITER') {
    throw new Error('Unauthorized role');
  }

  // Never allow empty slug — homepage links become /article/ and 404
  const rawSlug = typeof data.slug === 'string' ? data.slug.trim() : '';
  const slugSeed = rawSlug || data.title || 'post';

  if (data.id) {
    const existing = await prisma.post.findUnique({ where: { id: data.id } });
    if (!existing) throw new Error('Post not found');
    
    if (role === 'WRITER' && existing.authorId !== session.user.id) {
      throw new Error('You can only edit your own posts');
    }

    const slug = await ensureUniqueSlug(slugSeed, data.id);

    const updated = await prisma.post.update({
      where: { id: data.id },
      data: {
        title: data.title,
        slug,
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
        isAmerica250: data.isAmerica250 !== undefined ? data.isAmerica250 : false,
        isBreaking: data.isBreaking !== undefined ? data.isBreaking : false,
        // Always set an absolute expiry when Breaking is on (default 24h). Never leave null forever.
        breakingUntil:
          data.isBreaking
            ? computeBreakingUntil(data.breakingHours)
            : null,
        printEditionOrder: data.printEditionOrder ? parseInt(data.printEditionOrder) : null,
        imageCaption: data.imageCaption,
        ...(data.publishedAt !== undefined && { publishedAt: data.publishedAt ? new Date(data.publishedAt) : null })
      }
    });
    await maybeSyncArticleVideos(updated);
  } else {
    const slug = await ensureUniqueSlug(slugSeed);
    await prisma.post.create({
      data: {
        title: data.title,
        slug,
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
        isAmerica250: data.isAmerica250 !== undefined ? data.isAmerica250 : false,
        isBreaking: data.isBreaking !== undefined ? data.isBreaking : false,
        breakingUntil:
          data.isBreaking
            ? computeBreakingUntil(data.breakingHours)
            : null,
        printEditionOrder: data.printEditionOrder ? parseInt(data.printEditionOrder) : null,
        imageCaption: data.imageCaption,
        ...(data.publishedAt && { publishedAt: new Date(data.publishedAt) })
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
  const newName = formData.get('name') as string;

  if (!userId) throw new Error('Missing fields');

  await prisma.user.update({
    where: { id: userId },
    data: { 
      ...(newRole && { role: newRole }),
      ...(newEmail && { email: newEmail }),
      ...(newName && { name: newName })
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

export async function createWriter(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  const rawEmail = formData.get('email') as string;
  const email = rawEmail && rawEmail.trim() !== '' ? rawEmail.trim() : null;
  
  if (!name) throw new Error('Name is required');

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('User with this email already exists');
  }

  const bcrypt = await import('bcryptjs');
  // Generate random dummy password 
  const randomPassword = Math.random().toString(36).slice(-8) + 'A1!';
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'WRITER'
    }
  });

  if (email) {
    try {
      // 1. Generate Reset Token
      const token = crypto.randomUUID();
      
      // 2. Save to VerificationToken (expires in 24 hours)
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires
        }
      });

      // 3. Send email using Resend
      const origin = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'https://thecougarchronicle.com';
      const resetLink = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      
      const isMock = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('fallback');
      
      const subject = `You've been added as a Writer for The Cougar Chronicle!`;
      const html = `<p>Hi ${name},</p>
      <p>An administrator has created a writer account for you at The Cougar Chronicle.</p>
      <p>Please click the link below to set your password and log into your dashboard:</p>
      <p><a href="${resetLink}" style="display: inline-block; background-color: #1B2253; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Set My Password</a></p>
      <p>If the button doesn't work, copy and paste this link into your browser: <br/>${resetLink}</p>`;

      console.log(`\n=========================================\n[EMAIL NOTIFICATION] Set Password\nTo: ${email}\nLink: ${resetLink}\n=========================================\n`);

      if (!isMock) {
        await resend.emails.send({
          from: 'notifications@thecougarchronicle.com',
          to: email,
          subject,
          html
        });
      }
    } catch (e) {
      console.error('Failed to generate or send password set email:', e);
    }
  }

  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard/editor/[id]', 'page');
}

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
import { slugifyTitle, sanitizeSlugInput, withUniquenessSuffix } from '@/lib/slug';

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

  // Require full editorial checklist before submit / approve / publish
  if (
    newState === 'IN_REVIEW' ||
    newState === 'APPROVED' ||
    newState === 'PUBLISHED'
  ) {
    let checklist: Record<string, boolean> = {};
    try {
      const raw = (post as { editorChecklist?: unknown }).editorChecklist;
      checklist =
        typeof raw === 'string'
          ? JSON.parse(raw || '{}')
          : ((raw as Record<string, boolean>) || {});
    } catch {
      checklist = {};
    }
    const required = [
      'spellcheck',
      'seo',
      'formatting',
      'oneWordLinks',
      'ready',
    ] as const;
    const incomplete = required.filter((k) => !checklist[k]);
    if (incomplete.length > 0) {
      throw new Error(
        'Complete the editorial checklist before publishing (open the Checklist tab).'
      );
    }
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

async function ensureUniqueSlug(desired: string, excludeId?: string): Promise<string> {
  // Caller already auto-slugified or sanitized — never re-drop stop words here
  // (that would rewrite intentional editor slugs on every save).
  let n = 0;
  while (true) {
    const slug = withUniquenessSuffix(desired, n);
    const existing = await prisma.post.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return slug;
    n += 1;
  }
}

export async function savePost(data: any) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const role = session.user.role;
  if (role !== 'EDITOR' && role !== 'ADMIN' && role !== 'WRITER') {
    throw new Error('Unauthorized role');
  }

  // Never allow empty/invalid slug — homepage links become / and 404
  const rawSlug = typeof data.slug === 'string' ? data.slug.trim() : '';
  const cleaned = rawSlug ? sanitizeSlugInput(rawSlug) : '';
  const slugSeed = cleaned || slugifyTitle(String(data.title || 'article'), { dropStopWords: true });

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
        category: (() => {
          const c = String(data.category || '').toLowerCase();
          if (['campus', 'politics', 'family', 'faith'].includes(c)) return c;
          throw new Error('Category must be campus, politics, family, or faith');
        })(),
        format: data.format === 'opinion' ? 'opinion' : 'news',
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
        printEditionId:
          data.printEditionId === undefined
            ? undefined
            : data.printEditionId
              ? data.printEditionId
              : null,
        printEditionOrder:
          data.printEditionOrder === '' || data.printEditionOrder == null
            ? null
            : parseInt(String(data.printEditionOrder), 10),
        imageCaption: data.imageCaption,
        ...(data.editorChecklist !== undefined && {
          editorChecklist:
            typeof data.editorChecklist === 'string'
              ? data.editorChecklist
              : JSON.stringify(data.editorChecklist ?? {}),
        }),
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
        category: (() => {
          const c = String(data.category || '').toLowerCase();
          if (['campus', 'politics', 'family', 'faith'].includes(c)) return c;
          throw new Error('Category must be campus, politics, family, or faith');
        })(),
        format: data.format === 'opinion' ? 'opinion' : 'news',
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
        printEditionId: data.printEditionId || null,
        printEditionOrder:
          data.printEditionOrder === '' || data.printEditionOrder == null
            ? null
            : parseInt(String(data.printEditionOrder), 10),
        imageCaption: data.imageCaption,
        editorChecklist:
          typeof data.editorChecklist === 'string'
            ? data.editorChecklist
            : data.editorChecklist
              ? JSON.stringify(data.editorChecklist)
              : null,
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
  const archive = formData.get('archive') as string | null;
  const unarchive = formData.get('unarchive') as string | null;

  if (!userId) throw new Error('Missing fields');

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(newRole && { role: newRole }),
      ...(newEmail !== null && newEmail !== undefined && { email: newEmail || null }),
      ...(newName !== null && newName !== undefined && { name: newName || null }),
      ...(archive === 'true' && { archivedAt: new Date() }),
      ...(unarchive === 'true' && { archivedAt: null }),
    },
  });

  revalidatePath('/dashboard/users');
}

/** Client-friendly user update with instant feedback. */
export async function updateUserFields(data: {
  userId: string;
  name?: string;
  email?: string | null;
  role?: Role;
  archive?: boolean;
  unarchive?: boolean;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
  if (!data.userId) throw new Error('Missing userId');
  if (data.userId === session.user.id && data.archive) {
    throw new Error('You cannot archive yourself');
  }

  await prisma.user.update({
    where: { id: data.userId },
    data: {
      ...(data.name !== undefined && { name: data.name || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.role && { role: data.role }),
      ...(data.archive && { archivedAt: new Date() }),
      ...(data.unarchive && { archivedAt: null }),
    },
  });
  revalidatePath('/dashboard/users');
  return { ok: true as const };
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

export async function createStaffUser(data: {
  name: string;
  email?: string | null;
  role?: Role;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') throw new Error('Unauthorized');

  const name = (data.name || '').trim();
  const email = data.email?.trim() ? data.email.trim().toLowerCase() : null;
  const role: Role =
    data.role === 'EDITOR' || data.role === 'ADMIN' || data.role === 'WRITER'
      ? data.role
      : 'WRITER';

  if (!name) throw new Error('Name is required');

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('User with this email already exists');
  }

  const bcrypt = await import('bcryptjs');
  const randomPassword = Math.random().toString(36).slice(-8) + 'A1!';
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
  });

  let emailSent = false;
  if (email) {
    try {
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.verificationToken.create({
        data: { identifier: email, token, expires },
      });

      const origin =
        process.env.NEXTAUTH_URL ||
        process.env.AUTH_URL ||
        'https://thecougarchronicle.com';
      const resetLink = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      const isMock =
        !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('fallback');

      const roleLabel =
        role === 'ADMIN' ? 'an administrator' : role === 'EDITOR' ? 'an editor' : 'a writer';
      const subject = `Welcome to The Cougar Chronicle — set your password`;
      const html = `<p>Hi ${name},</p>
      <p>You've been added as <strong>${roleLabel}</strong> at The Cougar Chronicle.</p>
      <p>Set your password to access the dashboard:</p>
      <p><a href="${resetLink}" style="display: inline-block; background-color: #1B2253; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Set My Password</a></p>
      <p>If the button doesn't work, copy this link:<br/>${resetLink}</p>
      <p>This link expires in 24 hours.</p>`;

      console.log(`[EMAIL] Welcome ${role} → ${email} ${resetLink}`);

      if (!isMock) {
        await resend.emails.send({
          from: 'The Cougar Chronicle <notifications@updates.thecougarchronicle.com>',
          to: email,
          subject,
          html,
        });
        emailSent = true;
      }
    } catch (e) {
      console.error('Failed to generate or send password set email:', e);
    }
  }

  revalidatePath('/dashboard/users');
  return { ok: true as const, userId: user.id, emailSent };
}

/** @deprecated use createStaffUser */
export async function createWriter(formData: FormData) {
  await createStaffUser({
    name: formData.get('name') as string,
    email: (formData.get('email') as string) || null,
    role: 'WRITER',
  });
}

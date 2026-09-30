'use server'

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PostState, Role } from '@prisma/client';
import { getArticleUrl } from '@/lib/routes';
import { broadcastPostPublication } from '@/lib/publish-utils';
import { isResendConfigured, isValidEmail, sendOneEmail } from '@/lib/email';
import { notifyWriterAssigned } from '@/lib/desk-reminders';
import { syncArticleVideosToLibrary } from '@/lib/article-videos';
import { canApprovePosts, canEditAllPosts, canPublishPosts } from '@/lib/roles';
import { computeBreakingUntil, DEFAULT_BREAKING_HOURS } from '@/lib/breaking';
import { slugifyTitle, sanitizeSlugInput, withUniquenessSuffix } from '@/lib/slug';
import { mergeAuthors } from '@/lib/merge-authors';
import { persistArticleMedia, persistMediaUrl } from '@/lib/persist-article-media';



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
        
        if (isResendConfigured()) {
          await sendOneEmail({ to: editorEmails, subject, html });
        }
      }
    } else if (newState === 'APPROVED' && post.state === 'IN_REVIEW') {
      if (post.author.email) {
        const subject = `Your draft was approved: ${post.title}`;
        const html = `<p>Great news! Your draft "<strong>${post.title}</strong>" has been approved by an editor and is ready to be published.</p>`;
        
        console.log(`\n=========================================\n[EMAIL NOTIFICATION] Approval\nTo: ${post.author.email}\nSubject: ${subject}\n=========================================\n`);

        if (isResendConfigured()) {
          await sendOneEmail({ to: post.author.email, subject, html });
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
  revalidatePath('/news-sitemap.xml');
  revalidatePath('/sitemap.xml');
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
    const [content, imageUrl] = await Promise.all([
      persistArticleMedia(data.content || ''),
      persistMediaUrl(data.imageUrl || ''),
    ]);

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
        content,
        imageUrl: imageUrl || data.imageUrl,
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
        showDonateCta: data.showDonateCta !== undefined ? Boolean(data.showDonateCta) : true,
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
    revalidatePath(getArticleUrl(updated));
    revalidatePath(`/article/${updated.slug}`);
    revalidatePath(`/premium-article/${updated.slug}`);
  } else {
    const slug = await ensureUniqueSlug(slugSeed);
    const [content, imageUrl] = await Promise.all([
      persistArticleMedia(data.content || ''),
      persistMediaUrl(data.imageUrl || ''),
    ]);
    const created = await prisma.post.create({
      data: {
        title: data.title,
        slug,
        category: (() => {
          const c = String(data.category || '').toLowerCase();
          if (['campus', 'politics', 'family', 'faith'].includes(c)) return c;
          throw new Error('Category must be campus, politics, family, or faith');
        })(),
        format: data.format === 'opinion' ? 'opinion' : 'news',
        content,
        imageUrl: imageUrl || data.imageUrl,
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
        showDonateCta: data.showDonateCta !== undefined ? Boolean(data.showDonateCta) : true,
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
    revalidatePath(getArticleUrl(created));
  }

  revalidatePath('/dashboard');
  revalidatePath('/');
  revalidatePath('/news-sitemap.xml');
  revalidatePath('/sitemap.xml');
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

      try {
        await sendOneEmail({ to: post.author.email, subject, html });
      } catch (e) {
        console.error("Failed to email writer about requested changes", e);
      }
    }
  }

  revalidatePath(`/dashboard/editor/${postId}`);
}

async function sendStaffWelcome(opts: { name: string; email: string; role: Role }): Promise<boolean> {
  try {
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.verificationToken.create({
      data: { identifier: opts.email, token, expires },
    });

    const originCandidates = [
      process.env.NEXTAUTH_URL,
      process.env.AUTH_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
    ];
    let origin = 'https://thecougarchronicle.com';
    for (const raw of originCandidates) {
      if (!raw) continue;
      try {
        const url = new URL(raw);
        const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        if (isLocal && process.env.NODE_ENV === 'production') continue;
        origin = url.origin;
        break;
      } catch {
        // ignore malformed env values
      }
    }
    const resetLink = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(opts.email)}`;
    const roleLabel =
      opts.role === 'ADMIN' ? 'an administrator' : opts.role === 'EDITOR' ? 'an editor' : 'a writer';
    const safeName = opts.name
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const subject = `Welcome to The Cougar Chronicle — set your password`;
    const html = `<p>Hi ${safeName},</p>
      <p>You've been added as <strong>${roleLabel}</strong> at The Cougar Chronicle.</p>
      <p>Set your password to access the dashboard:</p>
      <p><a href="${resetLink}" style="display: inline-block; background-color: #1B2253; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Set My Password</a></p>
      <p>If the button doesn't work, copy this link:<br/>${resetLink}</p>
      <p>This link expires in 24 hours.</p>`;

    console.log(`[EMAIL] Welcome ${opts.role} → ${opts.email} ${resetLink}`);
    const sent = await sendOneEmail({ to: opts.email, subject, html });
    return sent.ok;
  } catch (e) {
    console.error('Failed to generate or send password set email:', e);
    return false;
  }
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

  const emailSent = email ? await sendStaffWelcome({ name, email, role }) : false;

  revalidatePath('/dashboard/users');
  return { ok: true as const, userId: user.id, emailSent };
}

export async function mergeAuthorsAction(data: {
  keepId: string;
  foldId: string;
  keepName?: string | null;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
  if (data.foldId === session.user.id) {
    throw new Error('You cannot merge your own login into someone else');
  }
  const result = await mergeAuthors({
    keepId: data.keepId,
    foldId: data.foldId,
    keepName: data.keepName,
  });
  revalidatePath('/dashboard/users');
  revalidatePath('/dashboard/team');
  revalidatePath('/about');
  revalidatePath(`/author/${result.keepId}`);
  revalidatePath(`/author/${result.foldId}`);
  revalidatePath('/');
  return result;
}

type DeskPerson = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
};

function cleanAssignmentDate(value: unknown): { ok: true; value: Date | null } | { ok: false; message: string } {
  if (typeof value !== 'string' || value.trim() === '') return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, message: 'Use a real date.' };
  const [year, month, day] = value.split('-').map(Number);
  if (year < 2020 || year > 2100) return { ok: false, message: 'Use a real date.' };
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { ok: false, message: 'Use a real date.' };
  }
  return { ok: true, value: date };
}

async function findDeskPerson(
  id: string | null,
  roles: Role[]
): Promise<{ ok: true; user: DeskPerson | null } | { ok: false; message: string }> {
  if (!id) return { ok: true, user: null };
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, archivedAt: true },
  });
  if (!user || user.archivedAt || !roles.includes(user.role)) {
    return { ok: false, message: 'Choose someone from the staff list.' };
  }
  return { ok: true, user };
}

/** Add a writer from the drafts desk. Name is required. Email turns on reminders and a password link. */
export async function createDeskWriter(data: {
  name: string;
  email?: string | null;
}): Promise<{ ok: true; user: DeskPerson } | { ok: false; message: string }> {
  const session = await auth();
  if (!session?.user || !canEditAllPosts(session.user.role)) {
    return { ok: false, message: 'Only editors can add a writer.' };
  }

  const name = (data?.name || '').trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, message: 'A name is required.' };
  if (name.length > 80) return { ok: false, message: 'Keep the name to 80 characters.' };

  let email: string | null = null;
  if (typeof data?.email === 'string' && data.email.trim()) {
    const candidate = data.email.trim().toLowerCase();
    if (!isValidEmail(candidate)) return { ok: false, message: 'That email does not look valid.' };
    email = candidate;
  }

  if (email) {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, archivedAt: true },
    });
    if (existing?.archivedAt) {
      return { ok: false, message: 'That person is archived. Restore them on the Users page first.' };
    }
    if (existing && (existing.role === 'WRITER' || existing.role === 'EDITOR' || existing.role === 'ADMIN')) {
      return {
        ok: true,
        user: { id: existing.id, name: existing.name, email: existing.email, role: existing.role },
      };
    }
    if (existing) return { ok: false, message: 'That email already belongs to a reader account.' };
  }

  const bcrypt = await import('bcryptjs');
  const randomPassword = Math.random().toString(36).slice(-8) + 'A1!';
  const hashedPassword = await bcrypt.hash(randomPassword, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: 'WRITER' },
    select: { id: true, name: true, email: true, role: true },
  });

  if (email) await sendStaffWelcome({ name, email, role: 'WRITER' });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/users');
  return { ok: true, user };
}

/** Assign a staff writer, a staff editor, and a target day. Does not publish or change the byline. */
export async function updateDraftAssignment(data: {
  postId: string;
  writerId: string;
  editorId: string;
  targetDate: string;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await auth();
  if (!session?.user || !canEditAllPosts(session.user.role)) {
    return { ok: false, message: 'Only editors can update these fields.' };
  }
  if (!data?.postId || typeof data.postId !== 'string') {
    return { ok: false, message: 'Missing story.' };
  }

  const writerId = typeof data.writerId === 'string' && data.writerId.trim() ? data.writerId.trim() : null;
  const editorId = typeof data.editorId === 'string' && data.editorId.trim() ? data.editorId.trim() : null;
  const writer = await findDeskPerson(writerId, ['WRITER', 'EDITOR', 'ADMIN']);
  if (!writer.ok) return writer;
  const editor = await findDeskPerson(editorId, ['EDITOR', 'ADMIN']);
  if (!editor.ok) return editor;
  const targetDate = cleanAssignmentDate(data.targetDate);
  if (!targetDate.ok) return targetDate;

  const post = await prisma.post.findUnique({
    where: { id: data.postId },
    select: { id: true, title: true, state: true, assignedWriterId: true },
  });
  if (!post) return { ok: false, message: 'Story not found.' };
  if (post.state === 'PUBLISHED') {
    return { ok: false, message: 'Published stories stay off the drafts desk.' };
  }

  const writerChanged = (post.assignedWriterId || null) !== (writer.user?.id || null);
  // Raw update so Prisma's @updatedAt does not rewrite "Last modified".
  const updated = await prisma.$executeRaw`
    UPDATE "Post"
    SET "assignedWriterId" = ${writer.user?.id || null},
        "assignedEditorId" = ${editor.user?.id || null},
        "targetPublishDate" = ${targetDate.value},
        "deskAssignedAt" = CASE WHEN ${writerChanged} THEN NOW() ELSE "deskAssignedAt" END
    WHERE "id" = ${data.postId}
      AND "state" <> 'PUBLISHED'
  `;
  if (updated === 0) {
    return { ok: false, message: 'That story is no longer on the drafts desk.' };
  }

  let message = 'Saved';
  if (writerChanged && writer.user) {
    const targetIso = targetDate.value
      ? `${targetDate.value.getUTCFullYear()}-${String(targetDate.value.getUTCMonth() + 1).padStart(2, '0')}-${String(targetDate.value.getUTCDate()).padStart(2, '0')}`
      : null;
    const emailResult = await notifyWriterAssigned({
      postId: post.id,
      title: post.title,
      targetDate: targetIso,
      writerName: writer.user.name,
      writerEmail: writer.user.email,
      editorName: editor.user?.name || null,
    });
    if (emailResult === 'skipped') message = 'Saved. Add an email for this writer to turn on reminders.';
    else if (emailResult === 'failed') message = 'Saved. The assignment email could not be sent.';
    else message = 'Saved. Assignment email sent.';
  }

  revalidatePath('/dashboard');
  return { ok: true, message };
}

/** @deprecated use createStaffUser */
export async function createWriter(formData: FormData) {
  await createStaffUser({
    name: formData.get('name') as string,
    email: (formData.get('email') as string) || null,
    role: 'WRITER',
  });
}

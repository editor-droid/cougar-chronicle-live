import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { Resend } from 'resend';
import { getArticleUrl } from '@/lib/routes';
import { isValidEmail } from '@/lib/email';

/**
 * Member creates a gift unlock for a premium post (consumes 1 giftLinks).
 * Body: { postId, recipientEmail?: string }
 * - Without email: returns shareable link (iMessage, etc.)
 * - With email: stores friend email on token + sends them the link
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const postId = body.postId as string | undefined;
    const recipientEmailRaw = (body.recipientEmail as string | undefined)?.trim().toLowerCase();

    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    if (recipientEmailRaw && !isValidEmail(recipientEmailRaw)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isSubscribed: true,
        membershipExpiresAt: true,
        giftLinks: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'EDITOR';
    const memberOk =
      user.isSubscribed &&
      (!user.membershipExpiresAt || user.membershipExpiresAt > new Date());
    if (!memberOk && !isStaff) {
      return NextResponse.json({ error: 'Membership required' }, { status: 403 });
    }
    if (user.giftLinks < 1 && !isStaff) {
      return NextResponse.json({ error: 'No gift unlocks remaining' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        slug: true,
        isPremium: true,
        printEditionId: true,
        state: true,
      },
    });

    if (!post || post.state !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    // Real friend email when provided; otherwise placeholder for link-only gifts
    const tokenEmail =
      recipientEmailRaw || `gift+${token.slice(0, 12)}@member.thecougarchronicle.com`;

    await prisma.$transaction([
      prisma.articleToken.create({
        data: {
          token,
          email: tokenEmail,
          postId: post.id,
          isGift: true,
          giftedByUserId: session.user.id,
        },
      }),
      ...(isStaff
        ? []
        : [
            prisma.user.update({
              where: { id: session.user.id },
              data: { giftLinks: { decrement: 1 } },
            }),
          ]),
    ]);

    const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const url = `${origin}/api/verify-token?token=${token}`;
    const remaining = isStaff ? user.giftLinks : Math.max(0, user.giftLinks - 1);

    let emailed = false;
    if (recipientEmailRaw && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromName = user.name || 'A Chronicle Member';
        await resend.emails.send({
          from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
          to: recipientEmailRaw,
          subject: `${fromName} gifted you a story: ${post.title}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1A1A1A;">
              <p style="font-size: 16px; line-height: 1.6;">Hi,</p>
              <p style="font-size: 16px; line-height: 1.6;">
                <strong>${fromName}</strong> gifted you full access to this article from
                <em>The Cougar Chronicle</em>:
              </p>
              <h2 style="font-size: 22px; line-height: 1.3; color: #1B2253; margin: 1.25rem 0;">
                ${post.title}
              </h2>
              <p style="margin: 1.5rem 0;">
                <a href="${url}"
                   style="display: inline-block; background: #1B2253; color: #fff; text-decoration: none;
                          padding: 12px 22px; border-radius: 4px; font-family: sans-serif; font-weight: bold;">
                  Read the full article
                </a>
              </p>
              <p style="font-size: 14px; color: #6B7280; line-height: 1.5; font-family: sans-serif;">
                Bookmark this email or the link — if you clear your browser, open the link again to restore access.
                Access lasts about one year on each device after you open the link.
              </p>
              <p style="font-size: 13px; color: #9CA3AF; font-family: sans-serif; margin-top: 2rem;">
                Want unlimited access?
                <a href="${origin}/membership" style="color: #1B2253;">Become a Member</a>
                ·
                <a href="${origin}/register" style="color: #1B2253;">Create a free account</a>
              </p>
            </div>
          `,
        });
        emailed = true;
      } catch (e) {
        console.error('[GIFTS] email send failed', e);
        // Link still works; report partial success
        return NextResponse.json({
          url,
          title: post.title,
          path: getArticleUrl(post),
          remaining,
          emailed: false,
          emailError: 'Gift link created, but the email failed to send. Copy the link and share it manually.',
        });
      }
    }

    return NextResponse.json({
      url,
      title: post.title,
      path: getArticleUrl(post),
      remaining,
      emailed,
      recipientEmail: recipientEmailRaw || null,
    });
  } catch (e) {
    console.error('[GIFTS]', e);
    return NextResponse.json({ error: 'Failed to create gift link' }, { status: 500 });
  }
}

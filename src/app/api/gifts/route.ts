import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { getArticleUrl } from '@/lib/routes';

/** Member creates a gift unlock link for a premium post (consumes 1 giftLinks). */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await req.json();
    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSubscribed: true, giftLinks: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'EDITOR';
    if (!user.isSubscribed && !isStaff) {
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
    const giftEmail = `gift+${token.slice(0, 12)}@member.thecougarchronicle.com`;

    await prisma.$transaction([
      prisma.articleToken.create({
        data: {
          token,
          email: giftEmail,
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

    return NextResponse.json({
      url,
      title: post.title,
      path: getArticleUrl(post),
      remaining: isStaff ? user.giftLinks : Math.max(0, user.giftLinks - 1),
    });
  } catch (e) {
    console.error('[GIFTS]', e);
    return NextResponse.json({ error: 'Failed to create gift link' }, { status: 500 });
  }
}

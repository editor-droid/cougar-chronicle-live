import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import {
  ARTICLE_VIEW_COOKIE,
  ARTICLE_VIEW_WINDOW_SEC,
  decideArticleView,
  isCrossSiteRequest,
  isPrefetchRequest,
} from '@/lib/article-views';
import { utcDay } from '@/lib/most-read';

export const dynamic = 'force-dynamic';

function headerGet(req: Request, name: string): string | null {
  return req.headers.get(name);
}

/** next-auth v5 session cookie. Absent for almost every public reader. */
function hasSessionCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return /(?:^|;\s*)(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/.test(cookieHeader);
}

/**
 * Count one article open. The article page itself does not write views, so a
 * refresh of cached or dynamic HTML cannot increment on its own.
 */
export async function POST(req: Request) {
  let postId = '';
  try {
    const body = await req.json();
    postId = typeof body?.postId === 'string' ? body.postId : '';
  } catch {
    return NextResponse.json({ ok: false, counted: false, reason: 'invalid' }, { status: 400 });
  }

  const get = (name: string) => headerGet(req, name);
  let role: string | null = null;
  if (hasSessionCookie(req.headers.get('cookie'))) {
    try {
      const session = await auth();
      role = session?.user?.role ?? null;
    } catch (error) {
      console.error('article view auth', error);
    }
  }

  const cookieStore = await cookies();
  const decision = decideArticleView({
    postId,
    cookie: cookieStore.get(ARTICLE_VIEW_COOKIE)?.value,
    userAgent: req.headers.get('user-agent'),
    prefetch: isPrefetchRequest(get),
    crossSite: isCrossSiteRequest(get, req.headers.get('host')),
    role,
  });

  if (!decision.count) {
    return NextResponse.json(
      { ok: true, counted: false, reason: decision.reason },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const post = await prisma.post.findFirst({
      where: { id: postId, state: 'PUBLISHED' },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json(
        { ok: false, counted: false, reason: 'missing' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const day = utcDay(new Date());
    await prisma.$transaction([
      prisma.post.update({
        where: { id: post.id },
        data: { views: { increment: 1 } },
      }),
      prisma.postViewDaily.upsert({
        where: { postId_date: { postId: post.id, date: day } },
        create: { postId: post.id, date: day, count: 1 },
        update: { count: { increment: 1 } },
      }),
    ]);
  } catch (error) {
    console.error('article view increment', error);
    return NextResponse.json(
      { ok: false, counted: false, reason: 'error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  cookieStore.set(ARTICLE_VIEW_COOKIE, decision.cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ARTICLE_VIEW_WINDOW_SEC,
    path: '/',
  });

  return NextResponse.json(
    { ok: true, counted: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

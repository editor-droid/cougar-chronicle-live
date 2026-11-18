import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { assertCanEditPost } from '@/lib/editor-access';
import { issuePreviewLink, listPreviewLinks, previewTtlMs, revokePreviewLink } from '@/lib/preview-links';

function errorStatus(message: string): number {
  if (/unauthorized/i.test(message)) return 401;
  if (/not found/i.test(message)) return 404;
  return 400;
}

async function editableDraft(postId: string, role: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, state: true },
  });
  assertCanEditPost(role, userId, post);
  return post;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const postId = new URL(req.url).searchParams.get('postId') || '';
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    await editableDraft(postId, session.user.role, session.user.id);
    const links = await listPreviewLinks(postId);
    return NextResponse.json({ links });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load preview links';
    console.error('[api/dashboard/posts/preview-link]', message);
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const postId = String(body.postId || '');
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    const post = await editableDraft(postId, session.user.role, session.user.id);

    if (body.revokeId) {
      const revoked = await revokePreviewLink(String(body.revokeId), postId);
      if (!revoked) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (post.state === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Preview links are for unpublished drafts' },
        { status: 400 }
      );
    }

    const issued = await issuePreviewLink({
      postId,
      userId: session.user.id,
      ttlMs: previewTtlMs(body.expiresInDays),
    });
    const path = `/preview/${issued.token}`;
    return NextResponse.json({
      ok: true,
      id: issued.id,
      path,
      expiresAt: issued.expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create preview link';
    console.error('[api/dashboard/posts/preview-link]', message);
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

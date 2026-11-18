import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { assertCanEditPost } from '@/lib/editor-access';
import { getPostRevision, listPostRevisions } from '@/lib/post-revisions';

function errorStatus(message: string): number {
  if (/unauthorized/i.test(message)) return 401;
  if (/not found/i.test(message)) return 404;
  return 400;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get('postId') || '';
    const revisionId = url.searchParams.get('revisionId') || '';
    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    assertCanEditPost(session.user.role, session.user.id, post);

    if (revisionId) {
      const revision = await getPostRevision(postId, revisionId);
      if (!revision) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ revision });
    }

    const revisions = await listPostRevisions(postId);
    return NextResponse.json({ revisions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load revisions';
    console.error('[api/dashboard/posts/revisions]', message);
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

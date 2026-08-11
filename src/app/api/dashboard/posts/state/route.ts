import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updatePostState } from '@/app/dashboard/actions';

/**
 * POST /api/dashboard/posts/state
 * Body: { postId: string, newState: string }
 * Avoids Server Action ID skew for submit / approve / publish from the editor.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const postId = String(body.postId || '');
    const newState = String(body.newState || '');
    if (!postId || !newState) {
      return NextResponse.json({ error: 'Missing postId or newState' }, { status: 400 });
    }

    const fd = new FormData();
    fd.append('postId', postId);
    fd.append('newState', newState);
    await updatePostState(fd);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update state';
    const status = /unauthorized/i.test(message) ? 401 : 400;
    console.error('[api/dashboard/posts/state]', message);
    return NextResponse.json({ error: message }, { status });
  }
}

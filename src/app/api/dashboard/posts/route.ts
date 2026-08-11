import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { savePost } from '@/app/dashboard/actions';

/**
 * POST /api/dashboard/posts
 * Save draft / update article. Uses a plain API route so editors are not
 * broken by Server Action ID skew after deploys or stale PWA caches.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    await savePost(data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to save post';
    const status =
      /unauthorized/i.test(message) ? 401 : /not found/i.test(message) ? 404 : 400;
    console.error('[api/dashboard/posts]', message);
    return NextResponse.json({ error: message }, { status });
  }
}

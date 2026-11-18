import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { savePost } from '@/app/dashboard/actions';
import prisma from '@/lib/prisma';
import { assertCanEditPost } from '@/lib/editor-access';
import { sameTimestamp } from '@/lib/editor-draft';
import { planAutosave } from '@/lib/revisions';
import { captureDraftRevision } from '@/lib/post-revisions';

/**
 * POST /api/dashboard/posts
 * Save draft / update article. Uses a plain API route so editors are not
 * broken by Server Action ID skew after deploys or stale PWA caches.
 *
 * Autosave of a published story never writes the live row. It may store a
 * throttled revision, and the editor keeps a local copy until a manual save.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const autosave = Boolean(data?.autosave);
    const id = typeof data?.id === 'string' ? data.id : '';

    if (planAutosave({ autosave, hasId: Boolean(id), state: 'DRAFT' }) === 'local-only') {
      return NextResponse.json({ ok: true, mode: 'local' });
    }

    if (autosave && id) {
      const existing = await prisma.post.findUnique({
        where: { id },
        select: { id: true, authorId: true, state: true, updatedAt: true },
      });
      assertCanEditPost(session.user.role, session.user.id, existing);

      const livePlan = planAutosave({
        autosave: true,
        hasId: true,
        state: existing.state,
      });

      if (!sameTimestamp(data.expectedUpdatedAt, existing.updatedAt)) {
        return NextResponse.json({
          ok: true,
          stale: true,
          mode: 'stale',
          updatedAt: existing.updatedAt.toISOString(),
        });
      }

      if (livePlan === 'revision-only') {
        try {
          await captureDraftRevision({
            postId: existing.id,
            authorId: session.user.id,
            state: existing.state,
            draft: data,
          });
        } catch (error) {
          console.error('[revisions] published autosave snapshot failed', error);
        }
        return NextResponse.json({
          ok: true,
          mode: 'local',
          updatedAt: existing.updatedAt.toISOString(),
        });
      }

      const saved = await savePost(data, { autosave: true, revalidate: false });
      return NextResponse.json({
        ok: true,
        mode: 'saved',
        id: saved.id,
        updatedAt: saved.updatedAt,
      });
    }

    const saved = await savePost(data);
    return NextResponse.json({
      ok: true,
      mode: 'saved',
      id: saved.id,
      updatedAt: saved.updatedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to save post';
    const status =
      /unauthorized/i.test(message) ? 401 : /not found/i.test(message) ? 404 : 400;
    console.error('[api/dashboard/posts]', message);
    return NextResponse.json({ error: message }, { status });
  }
}

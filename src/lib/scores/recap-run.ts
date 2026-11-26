import type { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getByuScores } from './get-byu-scores';
import { getGamePage } from './page-data';
import { listGames } from './stories';
import {
  buildRecapHtml,
  ensureRecap,
  recapSlug,
  recapTitle,
  shouldCreateRecap,
} from './recap';

/**
 * Post.authorId is required and there is no system user. An active admin
 * owns the draft; then an editor; then a writer. Email order keeps the
 * same person on every run. Readers never see it: the row stays DRAFT
 * with no publish time.
 */
export async function recapAuthorId(): Promise<string | null> {
  const roles: Role[] = ['ADMIN', 'EDITOR', 'WRITER'];
  for (const role of roles) {
    const user = await prisma.user.findFirst({
      where: { role, archivedAt: null },
      orderBy: { email: 'asc' },
      select: { id: true },
    });
    if (user) return user.id;
  }
  return null;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (await prisma.post.findFirst({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export async function createFinalRecapDrafts(now = Date.now()): Promise<{
  checked: number;
  created: number;
  skipped: number;
}> {
  const payload = await getByuScores(now);
  if (!payload) return { checked: 0, created: 0, skipped: 0 };
  const due = listGames(payload).filter((item) => shouldCreateRecap(item.game, now));
  if (due.length === 0) return { checked: 0, created: 0, skipped: 0 };

  const authorId = await recapAuthorId();
  if (!authorId) {
    console.error('[recap] no staff user to own the draft');
    return { checked: due.length, created: 0, skipped: due.length };
  }

  let created = 0;
  let skipped = 0;
  for (const item of due) {
    const outcome = await ensureRecap(item.game.id, {
      findExisting: async (eventId) => {
        const row = await prisma.post.findFirst({
          where: { autoRecapEventId: eventId },
          select: { id: true },
        });
        return row != null;
      },
      insert: async (eventId) => {
        const page = await getGamePage(item.sport, eventId, now);
        const game = page?.game ?? item.game;
        const slug = await uniqueSlug(recapSlug(item.sport, eventId));
        await prisma.post.create({
          data: {
            title: recapTitle(game),
            slug,
            category: 'sports',
            format: 'news',
            state: 'DRAFT',
            content: buildRecapHtml(game, page?.summary ?? null),
            authorId,
            espnEventId: eventId,
            autoRecapEventId: eventId,
            publishedAt: null,
          },
        });
      },
    });
    if (outcome === 'created') created += 1;
    else skipped += 1;
  }
  return { checked: due.length, created, skipped };
}

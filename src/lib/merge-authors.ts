import type { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { rewriteBylineName } from '@/lib/bylines';
import { getPublicTeam, savePublicTeam, SITE_KEYS } from '@/lib/site-content';

const ROLE_RANK: Record<Role, number> = {
  USER: 0,
  WRITER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  return /@(?:writers\.)?thecougarchronicle\.com$/i.test(email);
}

export type MergeAuthorsInput = {
  keepId: string;
  foldId: string;
  keepName?: string | null;
};

export type MergeAuthorsResult = {
  keepId: string;
  foldId: string;
  keepName: string;
  postsMoved: number;
  bylinesRewritten: number;
  rosterUpdated: boolean;
};

export async function mergeAuthors(input: MergeAuthorsInput): Promise<MergeAuthorsResult> {
  const keepId = input.keepId.trim();
  const foldId = input.foldId.trim();
  if (!keepId || !foldId) throw new Error('Pick both people');
  if (keepId === foldId) throw new Error('Cannot merge someone into themselves');

  const [keep, fold] = await Promise.all([
    prisma.user.findUnique({
      where: { id: keepId },
      include: { accounts: true, _count: { select: { posts: true } } },
    }),
    prisma.user.findUnique({
      where: { id: foldId },
      include: { accounts: true, _count: { select: { posts: true } } },
    }),
  ]);
  if (!keep || !fold) throw new Error('One of those accounts no longer exists');

  const keepName = (input.keepName || keep.name || fold.name || 'Staff').trim();
  if (!keepName) throw new Error('A display name is required');

  const keepRole =
    ROLE_RANK[fold.role] > ROLE_RANK[keep.role] ? fold.role : keep.role;

  const preferFoldEmail = isPlaceholderEmail(keep.email) && !isPlaceholderEmail(fold.email);
  const preferFoldImage = Boolean(fold.image) && !keep.image;
  const keepProviders = new Set(keep.accounts.map((a) => a.provider));

  const keepFavs = await prisma.favorite.findMany({
    where: { userId: keepId },
    select: { postId: true },
  });
  const keepFavPostIds = keepFavs.map((f) => f.postId);
  const keepVidFavs = await prisma.videoFavorite.findMany({
    where: { userId: keepId },
    select: { videoId: true },
  });
  const keepVidIds = keepVidFavs.map((f) => f.videoId);

  const moved = await prisma.$transaction(async (tx) => {
    const posts = await tx.post.updateMany({
      where: { authorId: foldId },
      data: { authorId: keepId },
    });
    await tx.editorialNote.updateMany({
      where: { authorId: foldId },
      data: { authorId: keepId },
    });
    if (keepFavPostIds.length) {
      await tx.favorite.deleteMany({
        where: { userId: foldId, postId: { in: keepFavPostIds } },
      });
    }
    await tx.favorite.updateMany({ where: { userId: foldId }, data: { userId: keepId } });
    if (keepVidIds.length) {
      await tx.videoFavorite.deleteMany({
        where: { userId: foldId, videoId: { in: keepVidIds } },
      });
    }
    await tx.videoFavorite.updateMany({
      where: { userId: foldId },
      data: { userId: keepId },
    });
    await tx.pushSubscription.updateMany({
      where: { userId: foldId },
      data: { userId: keepId },
    });
    await tx.session.deleteMany({ where: { userId: foldId } });

    for (const acc of fold.accounts) {
      if (keepProviders.has(acc.provider)) {
        await tx.account.delete({ where: { id: acc.id } });
      } else {
        await tx.account.update({ where: { id: acc.id }, data: { userId: keepId } });
        keepProviders.add(acc.provider);
      }
    }

    const keepUpdate: {
      name: string;
      role: Role;
      archivedAt: null;
      image?: string;
      email?: string;
      stripeId?: string | null;
      isSubscribed?: boolean;
      membershipExpiresAt?: Date | null;
    } = {
      name: keepName,
      role: keepRole,
      archivedAt: null,
    };
    if (preferFoldImage && fold.image) keepUpdate.image = fold.image;
    if (fold.isSubscribed && !keep.isSubscribed) {
      keepUpdate.isSubscribed = true;
      keepUpdate.membershipExpiresAt = fold.membershipExpiresAt;
    }
    if (preferFoldEmail && fold.email) {
      const foldEmail = fold.email;
      await tx.user.update({
        where: { id: foldId },
        data: { email: `archived.${foldId.slice(-8)}.${fold.email}` },
      });
      keepUpdate.email = foldEmail;
    }
    if (!keep.stripeId && fold.stripeId) {
      await tx.user.update({ where: { id: foldId }, data: { stripeId: null } });
      keepUpdate.stripeId = fold.stripeId;
    }

    await tx.user.update({ where: { id: keepId }, data: keepUpdate });
    await tx.user.update({
      where: { id: foldId },
      data: {
        archivedAt: new Date(),
        role: 'USER',
        ...(preferFoldEmail
          ? {}
          : fold.email
            ? { email: `archived.${foldId.slice(-8)}.${fold.email}` }
            : {}),
      },
    });

    return posts.count;
  });

  let bylinesRewritten = 0;
  if (fold.name && fold.name.trim() && fold.name.trim() !== keepName) {
    const bylinePosts = await prisma.post.findMany({
      where: { customAuthor: { contains: fold.name.trim(), mode: 'insensitive' } },
      select: { id: true, customAuthor: true },
    });
    for (const post of bylinePosts) {
      const current = post.customAuthor || '';
      const next = rewriteBylineName(current, fold.name, keepName);
      if (next === current) continue;
      await prisma.post.update({ where: { id: post.id }, data: { customAuthor: next } });
      bylinesRewritten += 1;
    }
  }

  const team = await getPublicTeam();
  let rosterUpdated = false;
  const nextTeam = team.map((member) => {
    const linked = member.userId === foldId || member.userId === keepId;
    const nameHit =
      fold.name &&
      member.name.trim().toLowerCase() === fold.name.trim().toLowerCase();
    if (!linked && !nameHit) return member;
    rosterUpdated = true;
    return { ...member, name: keepName, userId: keepId };
  });
  if (rosterUpdated) await savePublicTeam(nextTeam);

  const existing = await prisma.siteSetting.findUnique({
    where: { key: SITE_KEYS.authorRedirects },
  });
  const prev = existing?.value ? (JSON.parse(existing.value) as Record<string, string>) : {};
  prev[foldId] = keepId;
  for (const [from, to] of Object.entries(prev)) {
    if (to === foldId) prev[from] = keepId;
  }
  await prisma.siteSetting.upsert({
    where: { key: SITE_KEYS.authorRedirects },
    update: { value: JSON.stringify(prev) },
    create: { key: SITE_KEYS.authorRedirects, value: JSON.stringify(prev) },
  });

  return {
    keepId,
    foldId,
    keepName,
    postsMoved: moved,
    bylinesRewritten,
    rosterUpdated,
  };
}

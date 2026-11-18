import prisma from '@/lib/prisma';
import {
  assessPreviewAccess,
  createPreviewToken,
  hashPreviewToken,
  previewTokenSecret,
  PREVIEW_TOKEN_TTL_MS,
  verifyPreviewTokenSignature,
} from '@/lib/preview-token';

const DAY_MS = 24 * 60 * 60 * 1000;

export function previewTtlMs(expiresInDays: unknown): number {
  const days = Number(expiresInDays);
  if (!Number.isFinite(days) || days <= 0) return PREVIEW_TOKEN_TTL_MS;
  const clamped = Math.min(30, Math.max(1, Math.round(days)));
  return clamped * DAY_MS;
}

export async function issuePreviewLink(opts: {
  postId: string;
  userId: string;
  ttlMs?: number;
}) {
  const secret = previewTokenSecret();
  if (!secret) throw new Error('Preview links are not configured');
  const ttl = opts.ttlMs && opts.ttlMs > 0 ? opts.ttlMs : PREVIEW_TOKEN_TTL_MS;
  const issued = createPreviewToken(opts.postId, secret, Date.now(), ttl);
  const row = await prisma.previewToken.create({
    data: {
      postId: opts.postId,
      tokenHash: hashPreviewToken(issued.token),
      createdById: opts.userId,
      expiresAt: new Date(issued.expiresAt),
    },
    select: { id: true, expiresAt: true, createdAt: true },
  });
  return { id: row.id, token: issued.token, expiresAt: row.expiresAt, createdAt: row.createdAt };
}

export async function listPreviewLinks(postId: string) {
  return prisma.previewToken.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
}

export async function revokePreviewLink(id: string, postId: string): Promise<boolean> {
  const row = await prisma.previewToken.findFirst({
    where: { id, postId },
    select: { id: true },
  });
  if (!row) return false;
  await prisma.previewToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });
  return true;
}

/**
 * Resolve one token to that post only. Failures collapse to null so the
 * public page cannot tell a revoked link from a guess.
 */
export async function resolvePreviewPost(token: string) {
  const secret = previewTokenSecret();
  if (!secret) return null;

  const verified = verifyPreviewTokenSignature(token, secret);
  if (!verified.ok) return null;

  const record = await prisma.previewToken.findUnique({
    where: { tokenHash: hashPreviewToken(token) },
  });
  const access = assessPreviewAccess({
    token,
    secret,
    record: record
      ? {
          tokenHash: record.tokenHash,
          postId: record.postId,
          expiresAt: record.expiresAt,
          revokedAt: record.revokedAt,
        }
      : null,
  });
  if (!access.ok || access.postId !== verified.postId) return null;

  const post = await prisma.post.findUnique({
    where: { id: access.postId },
    include: { author: { select: { id: true, name: true, slug: true } } },
  });
  if (!post || post.id !== access.postId) return null;
  return { post, expiresAt: record?.expiresAt ?? new Date(verified.exp) };
}

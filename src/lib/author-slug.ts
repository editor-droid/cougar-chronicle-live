import type { User } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sanitizeSlugInput } from '@/lib/slug';

export type AuthorPathUser = { id: string; slug?: string | null };

export function authorPath(user: AuthorPathUser): string {
  return `/author/${user.slug || user.id}`;
}

function isUniqueConflict(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 'P2002'
  );
}

/** If slug is missing and name is present, slugify, uniquify (append -2), save, return slug. */
export async function ensureAuthorSlug(user: {
  id: string;
  name?: string | null;
  slug?: string | null;
}): Promise<string> {
  if (user.slug) return user.slug;
  const name = user.name?.trim();
  if (!name) return '';

  const base = sanitizeSlugInput(name);
  if (!base) return '';

  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    const taken = await prisma.user.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (taken && taken.id !== user.id) continue;
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { slug: candidate },
      });
      return candidate;
    } catch (err) {
      if (isUniqueConflict(err)) continue;
      throw err;
    }
  }

  return '';
}

export async function resolveAuthorParam(param: string): Promise<{
  user: User | null;
  matchedBy: 'slug' | 'id' | null;
}> {
  const bySlug = await prisma.user.findUnique({ where: { slug: param } });
  if (bySlug) return { user: bySlug, matchedBy: 'slug' };
  const byId = await prisma.user.findUnique({ where: { id: param } });
  if (byId) return { user: byId, matchedBy: 'id' };
  return { user: null, matchedBy: null };
}

'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import {
  saveMediaAppearances,
  savePublicTeam,
  type MediaAppearance,
  type TeamMember,
} from '@/lib/site-content';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function updateMediaAppearancesAction(items: MediaAppearance[]) {
  await requireAdmin();
  await saveMediaAppearances(items);
  revalidatePath('/dashboard/media');
  revalidatePath('/dashboard/team-media');
  revalidatePath('/recruiting');
  revalidatePath('/apply');
  return { ok: true as const };
}

export async function updatePublicTeamAction(items: TeamMember[]) {
  await requireAdmin();
  await savePublicTeam(items);
  revalidatePath('/dashboard/team');
  revalidatePath('/dashboard/team-media');
  revalidatePath('/about');
  return { ok: true as const };
}

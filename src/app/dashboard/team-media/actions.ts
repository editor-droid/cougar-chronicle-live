'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import {
  getPublicTeam,
  saveMediaAppearances,
  saveOpenRoles,
  savePublicTeam,
  TEAM_GROUP_ORDER,
  type MediaAppearance,
  type OpenRole,
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
  revalidatePath('/dashboard/appearances');
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

export async function updateStaffOrganizerMemberAction(input: {
  teamId?: string | null;
  name: string;
  joinedAt?: string | null;
  userId?: string | null;
  addToRoster?: boolean;
  group?: TeamMember['group'];
}) {
  await requireAdmin();
  const team = await getPublicTeam();

  const joinedAt = input.joinedAt?.trim() || '';
  const userId = input.userId?.trim() || '';
  const name = (input.name || '').trim();
  if (!name) throw new Error('Name is required');

  let next = [...team];
  const existingIdx = input.teamId
    ? next.findIndex((m) => m.id === input.teamId)
    : next.findIndex((m) => m.name.toLowerCase() === name.toLowerCase());

  if (existingIdx >= 0) {
    const prev = next[existingIdx];
    const patched: TeamMember = { ...prev };
    if (input.joinedAt !== undefined) {
      if (joinedAt) patched.joinedAt = joinedAt;
      else delete patched.joinedAt;
    }
    if (input.userId !== undefined) {
      if (userId) patched.userId = userId;
      else delete patched.userId;
    }
    next[existingIdx] = patched;
  } else if (input.addToRoster) {
    const group = input.group && TEAM_GROUP_ORDER.includes(input.group) ? input.group : 'staff_writers';
    next.push({
      id: `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      title: '',
      group,
      sortOrder: next.filter((m) => m.group === group).length,
      joinedAt: joinedAt || undefined,
      userId: userId || undefined,
    });
  } else {
    throw new Error('That person is not on the public roster yet.');
  }

  await savePublicTeam(next);
  revalidatePath('/dashboard/team');
  revalidatePath('/about');
  return { ok: true as const };
}

export async function updateOpenRolesAction(items: OpenRole[]) {
  await requireAdmin();
  await saveOpenRoles(items);
  revalidatePath('/dashboard/team');
  revalidatePath('/recruiting');
  revalidatePath('/apply');
  return { ok: true as const };
}

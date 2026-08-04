import prisma from '@/lib/prisma';
import {
  DEFAULT_MEDIA_APPEARANCES,
  DEFAULT_OPEN_ROLES,
  DEFAULT_PUBLIC_TEAM,
  TEAM_GROUP_ORDER,
  type MediaAppearance,
  type OpenRole,
  type OpenRoleKind,
  type TeamGroup,
  type TeamMember,
} from '@/lib/site-content-types';

export type { MediaAppearance, OpenRole, OpenRoleKind, TeamGroup, TeamMember };
export {
  TEAM_GROUP_LABELS,
  TEAM_GROUP_ORDER,
  DEFAULT_MEDIA_APPEARANCES,
  DEFAULT_OPEN_ROLES,
  DEFAULT_PUBLIC_TEAM,
} from '@/lib/site-content-types';

/** Keys in SiteSetting.value (JSON text). */
export const SITE_KEYS = {
  mediaAppearances: 'mediaAppearances',
  publicTeam: 'publicTeam',
  openRoles: 'openRoles',
} as const;

function newId() {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readJsonSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (!row?.value) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonSetting(key: string, value: unknown) {
  const text = JSON.stringify(value);
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: text },
    create: { key, value: text },
  });
}

export async function getMediaAppearances(): Promise<MediaAppearance[]> {
  const list = await readJsonSetting<MediaAppearance[]>(
    SITE_KEYS.mediaAppearances,
    DEFAULT_MEDIA_APPEARANCES
  );
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveMediaAppearances(list: MediaAppearance[]) {
  const normalized = list.map((item, i) => ({
    id: item.id || newId(),
    outlet: (item.outlet || '').trim(),
    title: (item.title || '').trim(),
    url: (item.url || '').trim(),
    note: (item.note || '').trim(),
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
  }));
  await writeJsonSetting(SITE_KEYS.mediaAppearances, normalized);
  return normalized;
}

export async function getPublicTeam(): Promise<TeamMember[]> {
  const list = await readJsonSetting<TeamMember[]>(SITE_KEYS.publicTeam, DEFAULT_PUBLIC_TEAM);
  return [...list].sort((a, b) => {
    const ga = TEAM_GROUP_ORDER.indexOf(a.group);
    const gb = TEAM_GROUP_ORDER.indexOf(b.group);
    if (ga !== gb) return ga - gb;
    return a.sortOrder - b.sortOrder;
  });
}

export async function savePublicTeam(list: TeamMember[]) {
  const normalized = list.map((item, i) => ({
    id: item.id || newId(),
    name: (item.name || '').trim(),
    title: (item.title || '').trim(),
    group: (TEAM_GROUP_ORDER.includes(item.group) ? item.group : 'contributors') as TeamGroup,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
  }));
  await writeJsonSetting(SITE_KEYS.publicTeam, normalized);
  return normalized;
}

export function groupTeamMembers(members: TeamMember[]): Record<TeamGroup, TeamMember[]> {
  const out: Record<TeamGroup, TeamMember[]> = {
    editors: [],
    staff_writers: [],
    contributors: [],
    social: [],
    emeritus: [],
  };
  for (const m of members) {
    if (out[m.group]) out[m.group].push(m);
  }
  return out;
}

export async function getOpenRoles(): Promise<OpenRole[]> {
  const list = await readJsonSetting<OpenRole[]>(SITE_KEYS.openRoles, DEFAULT_OPEN_ROLES);
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Only roles/beats marked open — used by Apply page + form. */
export async function getActiveOpenRoles(): Promise<OpenRole[]> {
  return (await getOpenRoles()).filter((r) => r.isOpen && r.title.trim());
}

export async function saveOpenRoles(list: OpenRole[]) {
  const normalized = list.map((item, i) => ({
    id: item.id || newId(),
    title: (item.title || '').trim(),
    kind: (item.kind === 'beat' ? 'beat' : 'role') as OpenRoleKind,
    isOpen: item.isOpen !== false,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
  }));
  await writeJsonSetting(SITE_KEYS.openRoles, normalized);
  return normalized;
}

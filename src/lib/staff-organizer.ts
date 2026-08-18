import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';
import {
  TEAM_GROUP_LABELS,
  type TeamGroup,
  type TeamMember,
} from '@/lib/site-content-types';
import { getPublicTeam } from '@/lib/site-content';
import type {
  StaffActivity,
  StaffOrganizerData,
  StaffOrganizerRow,
} from '@/lib/staff-organizer-types';

export type {
  StaffActivity,
  StaffLinkableUser,
  StaffOrganizerData,
  StaffOrganizerRow,
  StaffRecentStory,
  StaffSource,
} from '@/lib/staff-organizer-types';
export { formatTenure } from '@/lib/staff-organizer-types';

type PostRow = {
  id: string;
  title: string;
  slug: string;
  state: string;
  publishedAt: Date | null;
  createdAt: Date;
  isPremium: boolean;
  printEditionId: string | null;
  customAuthor: string | null;
  authorId: string;
  authorName: string | null;
};

const ORG_BYLINES = new Set([
  'the cougar chronicle',
  'cougar chronicle',
  'editorial board',
  'staff',
  'staff writer',
  'guest contributor',
]);

function normName(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isOrgByline(name: string): boolean {
  return ORG_BYLINES.has(normName(name));
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

const FIRST_ALIASES: Record<string, string> = {
  alex: 'alexander',
  alexander: 'alexander',
  tommy: 'thomas',
  tom: 'thomas',
  thomas: 'thomas',
  sam: 'samuel',
  samuel: 'samuel',
  liz: 'elizabeth',
  eliza: 'elizabeth',
  elizabeth: 'elizabeth',
};

function canonFirst(first: string): string {
  return FIRST_ALIASES[first] || first;
}

/** Exact, close spelling (Horde/Hord), first+last aliases, or unique first name (Tommy). */
function namesMatch(person: string, byline: string, firstNameIndex: Map<string, string[]>): boolean {
  const a = normName(person);
  const b = normName(byline);
  if (!a || !b) return false;
  if (a === b) return true;
  if (/\band\b/.test(b)) return false;
  if (Math.max(a.length, b.length) >= 6 && editDistance(a, b) <= 2) return true;
  const aParts = a.split(' ');
  const bParts = b.split(' ');
  if (aParts.length >= 2 && bParts.length >= 2) {
    const aLast = aParts[aParts.length - 1];
    const bLast = bParts[bParts.length - 1];
    if (aLast === bLast && canonFirst(aParts[0]) === canonFirst(bParts[0])) return true;
    if (aLast.length >= 5 && bLast.length >= 5 && editDistance(aLast, bLast) <= 1 && canonFirst(aParts[0]) === canonFirst(bParts[0])) {
      return true;
    }
  }
  const first = bParts[0];
  if (bParts.length === 1 && firstNameIndex.get(first)?.length === 1) {
    return firstNameIndex.get(first)![0] === a;
  }
  return false;
}

function isoDay(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function activityFor(lastPublishedAt: Date | null, now: number): StaffActivity {
  if (!lastPublishedAt) return 'none';
  const age = now - lastPublishedAt.getTime();
  if (age <= 30 * 86400000) return 'hot';
  if (age <= 90 * 86400000) return 'active';
  return 'quiet';
}

function groupLabel(group: TeamGroup | 'account' | 'unlisted'): string {
  if (group === 'account') return 'Account only';
  if (group === 'unlisted') return 'Unlisted byline';
  return TEAM_GROUP_LABELS[group];
}

function bylineOf(post: PostRow): { name: string; userId: string | null } {
  const custom = post.customAuthor?.trim();
  if (custom) return { name: custom, userId: null };
  return { name: (post.authorName || '').trim(), userId: post.authorId };
}

function collectFor(
  posts: PostRow[],
  match: (post: PostRow, byline: { name: string; userId: string | null }) => boolean,
  now: number
) {
  const matched = posts.filter((p) => match(p, bylineOf(p)));
  const published = matched.filter((p) => p.state === 'PUBLISHED');
  const pipeline = matched.filter((p) => p.state !== 'PUBLISHED');
  const pubDates = published
    .map((p) => p.publishedAt || p.createdAt)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime());
  const first = pubDates[0] || null;
  const last = pubDates[pubDates.length - 1] || null;
  const last30 = published.filter((p) => {
    const d = p.publishedAt || p.createdAt;
    return now - d.getTime() <= 30 * 86400000;
  }).length;
  const last90 = published.filter((p) => {
    const d = p.publishedAt || p.createdAt;
    return now - d.getTime() <= 90 * 86400000;
  }).length;
  const recent = [...published]
    .sort((a, b) => {
      const da = (a.publishedAt || a.createdAt).getTime();
      const db = (b.publishedAt || b.createdAt).getTime();
      return db - da;
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      href: getArticleUrl(p),
      state: p.state,
      publishedAt: isoDay(p.publishedAt || p.createdAt),
    }));

  return {
    publishedCount: published.length,
    pipelineCount: pipeline.length,
    last30,
    last90,
    firstPublishedAt: first,
    lastPublishedAt: last,
    activity: activityFor(last, now),
    recent,
  };
}

export async function getStaffOrganizerData(): Promise<StaffOrganizerData> {
  const now = Date.now();
  const [team, users, posts] = await Promise.all([
    getPublicTeam(),
    prisma.user.findMany({
      where: {
        archivedAt: null,
        role: { in: ['WRITER', 'EDITOR', 'ADMIN'] },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.post.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        state: true,
        publishedAt: true,
        createdAt: true,
        isPremium: true,
        printEditionId: true,
        customAuthor: true,
        authorId: true,
        author: { select: { name: true } },
      },
    }),
  ]);

  const postRows: PostRow[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    state: p.state,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    isPremium: p.isPremium,
    printEditionId: p.printEditionId,
    customAuthor: p.customAuthor,
    authorId: p.authorId,
    authorName: p.author.name,
  }));

  const usedUserIds = new Set<string>();
  const usedNames = new Set<string>();
  const claimedPostIds = new Set<string>();
  const rows: StaffOrganizerRow[] = [];

  const userById = new Map(users.map((u) => [u.id, u]));
  const userByName = new Map<string, (typeof users)[number]>();
  for (const u of users) {
    const n = normName(u.name);
    if (n && !userByName.has(n)) userByName.set(n, u);
  }

  const knownPeople = [
    ...team.map((m) => m.name),
    ...users.map((u) => u.name || ''),
  ].filter(Boolean);
  const firstNameIndex = new Map<string, string[]>();
  for (const name of knownPeople) {
    const n = normName(name);
    const first = n.split(' ')[0];
    if (!first) continue;
    const list = firstNameIndex.get(first) || [];
    if (!list.includes(n)) list.push(n);
    firstNameIndex.set(first, list);
  }

  function attachUser(member: TeamMember) {
    if (member.userId && userById.has(member.userId)) return userById.get(member.userId)!;
    const n = normName(member.name);
    return n ? userByName.get(n) : undefined;
  }

  function takePostsFor(name: string, userId: string | null) {
    return collectFor(
      postRows,
      (post, byline) => {
        if (claimedPostIds.has(post.id)) return false;
        if (isOrgByline(byline.name)) return false;
        if (namesMatch(name, byline.name, firstNameIndex)) return true;
        if (userId && !post.customAuthor && post.authorId === userId && !byline.name) return true;
        return false;
      },
      now
    );
  }

  for (const member of team) {
    if (!member.name.trim()) continue;
    const user = attachUser(member);
    if (user) usedUserIds.add(user.id);
    usedNames.add(normName(member.name));

    const stats = takePostsFor(member.name, user?.id || member.userId || null);
    for (const p of postRows) {
      const byline = bylineOf(p);
      if (isOrgByline(byline.name)) continue;
      if (namesMatch(member.name, byline.name, firstNameIndex)) claimedPostIds.add(p.id);
      else if (user && !p.customAuthor && p.authorId === user.id && !byline.name) claimedPostIds.add(p.id);
    }

    const joinedAt = member.joinedAt || null;
    const tenureStart = joinedAt || isoDay(stats.firstPublishedAt);
    rows.push({
      key: `team:${member.id}`,
      name: member.name,
      title: member.title,
      group: member.group,
      groupLabel: groupLabel(member.group),
      source: 'roster',
      teamId: member.id,
      userId: user?.id || member.userId || null,
      userEmail: user?.email || null,
      userRole: user?.role || null,
      joinedAt,
      publishedCount: stats.publishedCount,
      pipelineCount: stats.pipelineCount,
      last30: stats.last30,
      last90: stats.last90,
      firstPublishedAt: isoDay(stats.firstPublishedAt),
      lastPublishedAt: isoDay(stats.lastPublishedAt),
      tenureStart,
      tenureSource: joinedAt ? 'joined' : stats.firstPublishedAt ? 'first_article' : null,
      activity: stats.activity,
      recent: stats.recent,
    });
  }

  for (const user of users) {
    if (usedUserIds.has(user.id)) continue;
    const n = normName(user.name);
    if (n && usedNames.has(n)) continue;
    if (n) usedNames.add(n);
    usedUserIds.add(user.id);

    const displayName = user.name || user.email || 'Staff account';
    const stats = takePostsFor(displayName, user.id);
    for (const p of postRows) {
      const byline = bylineOf(p);
      if (isOrgByline(byline.name)) continue;
      if (namesMatch(displayName, byline.name, firstNameIndex)) claimedPostIds.add(p.id);
      else if (!p.customAuthor && p.authorId === user.id && !byline.name) claimedPostIds.add(p.id);
    }

    rows.push({
      key: `user:${user.id}`,
      name: user.name || user.email || 'Staff account',
      title: user.role,
      group: 'account',
      groupLabel: groupLabel('account'),
      source: 'account',
      teamId: null,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      joinedAt: null,
      publishedCount: stats.publishedCount,
      pipelineCount: stats.pipelineCount,
      last30: stats.last30,
      last90: stats.last90,
      firstPublishedAt: isoDay(stats.firstPublishedAt),
      lastPublishedAt: isoDay(stats.lastPublishedAt),
      tenureStart: isoDay(stats.firstPublishedAt),
      tenureSource: stats.firstPublishedAt ? 'first_article' : null,
      activity: stats.activity,
      recent: stats.recent,
    });
  }

  const leftoverNames = new Map<string, string>();
  for (const post of postRows) {
    if (claimedPostIds.has(post.id)) continue;
    if (post.state !== 'PUBLISHED') continue;
    const byline = bylineOf(post);
    const n = normName(byline.name);
    if (!n || isOrgByline(byline.name)) continue;
    if (!leftoverNames.has(n)) leftoverNames.set(n, byline.name);
  }

  for (const [n, display] of leftoverNames) {
    const stats = takePostsFor(display, null);
    if (stats.publishedCount === 0) continue;
    rows.push({
      key: `byline:${n}`,
      name: display,
      title: '',
      group: 'unlisted',
      groupLabel: groupLabel('unlisted'),
      source: 'unlisted',
      teamId: null,
      userId: null,
      userEmail: null,
      userRole: null,
      joinedAt: null,
      publishedCount: stats.publishedCount,
      pipelineCount: stats.pipelineCount,
      last30: stats.last30,
      last90: stats.last90,
      firstPublishedAt: isoDay(stats.firstPublishedAt),
      lastPublishedAt: isoDay(stats.lastPublishedAt),
      tenureStart: isoDay(stats.firstPublishedAt),
      tenureSource: stats.firstPublishedAt ? 'first_article' : null,
      activity: stats.activity,
      recent: stats.recent,
    });
  }

  rows.sort((a, b) => {
    if (b.publishedCount !== a.publishedCount) return b.publishedCount - a.publishedCount;
    return a.name.localeCompare(b.name);
  });

  const roster = rows.filter((r) => r.source === 'roster').length;
  const published30 = rows.reduce((sum, r) => sum + r.last30, 0);
  const quiet = rows.filter((r) => r.source === 'roster' && r.activity === 'quiet').length;
  const unlisted = rows.filter((r) => r.source === 'unlisted').length;

  return {
    rows,
    users: users.map((u) => ({
      id: u.id,
      name: u.name || u.email || 'Staff',
      email: u.email,
      role: u.role,
    })),
    summary: { roster, published30, quiet, unlisted },
  };
}

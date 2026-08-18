import type { TeamGroup } from '@/lib/site-content-types';

export type StaffActivity = 'hot' | 'active' | 'quiet' | 'none';

export type StaffSource = 'roster' | 'account' | 'unlisted';

export type StaffRecentStory = {
  id: string;
  title: string;
  slug: string;
  href: string;
  state: string;
  publishedAt: string | null;
};

export type StaffLinkableUser = {
  id: string;
  name: string;
  email: string | null;
  role: string;
};

export type StaffOrganizerRow = {
  key: string;
  name: string;
  title: string;
  group: TeamGroup | 'account' | 'unlisted';
  groupLabel: string;
  source: StaffSource;
  teamId: string | null;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  joinedAt: string | null;
  publishedCount: number;
  pipelineCount: number;
  last30: number;
  last90: number;
  firstPublishedAt: string | null;
  lastPublishedAt: string | null;
  tenureStart: string | null;
  tenureSource: 'joined' | 'first_article' | null;
  activity: StaffActivity;
  recent: StaffRecentStory[];
};

export type StaffOrganizerData = {
  rows: StaffOrganizerRow[];
  users: StaffLinkableUser[];
  summary: {
    roster: number;
    published30: number;
    quiet: number;
    unlisted: number;
  };
};

export function formatTenure(start: string | null, now = new Date()): string {
  if (!start) return '—';
  const from = new Date(`${start}T00:00:00`);
  if (Number.isNaN(from.getTime())) return '—';
  let months =
    (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months -= 1;
  if (months < 0) months = 0;
  if (months < 1) return 'New';
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return years === 1 ? '1 yr' : `${years} yr`;
  return `${years}y ${rem}m`;
}

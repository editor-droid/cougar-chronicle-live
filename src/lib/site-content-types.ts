/** Shared types/constants for public team + media appearances (safe for client components). */

export type MediaAppearance = {
  id: string;
  outlet: string;
  title: string;
  url: string;
  note: string;
  sortOrder: number;
};

export type TeamGroup =
  | 'editors'
  | 'staff_writers'
  | 'contributors'
  | 'social'
  | 'emeritus';

export type TeamMember = {
  id: string;
  name: string;
  title: string;
  group: TeamGroup;
  sortOrder: number;
};

export const TEAM_GROUP_LABELS: Record<TeamGroup, string> = {
  editors: 'Editors',
  staff_writers: 'Staff Writers',
  contributors: 'Contributors',
  social: 'Social Media & Content',
  emeritus: 'Editors Emeritus',
};

export const TEAM_GROUP_ORDER: TeamGroup[] = [
  'editors',
  'staff_writers',
  'contributors',
  'social',
  'emeritus',
];

export const DEFAULT_MEDIA_APPEARANCES: MediaAppearance[] = [];

/** Matches org chart; Carter Seitz intentionally omitted. */
export const DEFAULT_PUBLIC_TEAM: TeamMember[] = [
  { id: 'e1', name: 'Kimball Call', title: 'Editor-in-Chief', group: 'editors', sortOrder: 0 },
  { id: 'e2', name: 'Ethan Horde', title: 'Managing Editor', group: 'editors', sortOrder: 1 },
  { id: 'e3', name: 'Alex Halpren', title: 'Assistant Managing Editor', group: 'editors', sortOrder: 2 },
  { id: 'e4', name: 'Eliza Andersen', title: 'Executive Editor, Campus News', group: 'editors', sortOrder: 3 },
  { id: 'e5', name: 'Nathan Andersen', title: 'Assistant Editor, Campus News', group: 'editors', sortOrder: 4 },
  { id: 'e6', name: 'Gracey Berky', title: 'Executive Editor, Politics', group: 'editors', sortOrder: 5 },
  { id: 'e7', name: 'Juliet Ingram', title: 'Executive Editor, Family', group: 'editors', sortOrder: 6 },
  { id: 'e8', name: 'Aubrey Hudson', title: 'Assistant Editor, Family', group: 'editors', sortOrder: 7 },
  { id: 'e9', name: 'Reagan Sumrall', title: 'Executive Editor, Print Edition', group: 'editors', sortOrder: 8 },
  { id: 'sw1', name: 'Jonah Berthold', title: '', group: 'staff_writers', sortOrder: 0 },
  { id: 'sw2', name: 'Jackson Galini', title: '', group: 'staff_writers', sortOrder: 1 },
  { id: 'c1', name: 'Esther Bright', title: 'Family', group: 'contributors', sortOrder: 0 },
  { id: 'c2', name: 'Sam Jacobs', title: '', group: 'contributors', sortOrder: 1 },
  { id: 'c3', name: 'Mariah', title: 'UVU Investigative', group: 'contributors', sortOrder: 2 },
  { id: 'em1', name: 'Jacob Christiansen', title: 'Board of Directors', group: 'emeritus', sortOrder: 0 },
  { id: 'em2', name: 'Tommy Stevenson', title: 'Board of Directors', group: 'emeritus', sortOrder: 1 },
  { id: 'em3', name: 'Logan Spears', title: 'Board of Directors', group: 'emeritus', sortOrder: 2 },
];

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

/** Open roles / beats on Apply — admin-managed; drives form chips + “Where you fit”. */
export type OpenRoleKind = 'role' | 'beat';

export type OpenRole = {
  id: string;
  title: string;
  kind: OpenRoleKind;
  /** When false, hidden from Apply page and form. */
  isOpen: boolean;
  sortOrder: number;
};

/**
 * Defaults from org chart vacancies (Jul 2026): empty seats + general staff writer.
 * Beats stay available so applicants can pick a section focus.
 */
export const DEFAULT_OPEN_ROLES: OpenRole[] = [
  { id: 'r1', title: 'Executive Media Editor', kind: 'role', isOpen: true, sortOrder: 0 },
  { id: 'r2', title: 'Assistant Media Editor', kind: 'role', isOpen: true, sortOrder: 1 },
  { id: 'r3', title: 'Executive Editor, Faith', kind: 'role', isOpen: true, sortOrder: 2 },
  { id: 'r4', title: 'Assistant Editor, Politics', kind: 'role', isOpen: true, sortOrder: 3 },
  { id: 'r5', title: 'Assistant Editor, Print Edition', kind: 'role', isOpen: true, sortOrder: 4 },
  { id: 'r6', title: 'Staff Writer', kind: 'role', isOpen: true, sortOrder: 5 },
  { id: 'r7', title: 'Staff Writer, Campus News', kind: 'role', isOpen: true, sortOrder: 6 },
  { id: 'r8', title: 'Staff Writer, Politics', kind: 'role', isOpen: true, sortOrder: 7 },
  { id: 'r9', title: 'Staff Writer, Family', kind: 'role', isOpen: true, sortOrder: 8 },
  { id: 'r10', title: 'Staff Writer, Faith', kind: 'role', isOpen: true, sortOrder: 9 },
  { id: 'r11', title: 'Staff Writer, Print Edition', kind: 'role', isOpen: true, sortOrder: 10 },
  { id: 'r12', title: 'Photographer', kind: 'role', isOpen: true, sortOrder: 11 },
  { id: 'r13', title: 'Video Editor', kind: 'role', isOpen: true, sortOrder: 12 },
  { id: 'r14', title: 'Content Creator', kind: 'role', isOpen: true, sortOrder: 13 },
  { id: 'b1', title: 'Campus News', kind: 'beat', isOpen: true, sortOrder: 20 },
  { id: 'b2', title: 'Politics', kind: 'beat', isOpen: true, sortOrder: 21 },
  { id: 'b3', title: 'Family Issues', kind: 'beat', isOpen: true, sortOrder: 22 },
  { id: 'b4', title: 'Faith', kind: 'beat', isOpen: true, sortOrder: 23 },
  { id: 'b5', title: 'Print Edition', kind: 'beat', isOpen: true, sortOrder: 24 },
];

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

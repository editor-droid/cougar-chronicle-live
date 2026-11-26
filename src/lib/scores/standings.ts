import { z } from 'zod';

const idSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

const statSchema = z.object({
  name: z.string().optional(),
  abbreviation: z.string().optional(),
  displayValue: z.string().optional(),
}).passthrough();

const entrySchema = z.object({
  team: z.object({
    id: idSchema,
    displayName: z.string().optional(),
    shortDisplayName: z.string().optional(),
    location: z.string().optional(),
    abbreviation: z.string().optional(),
  }).passthrough(),
  stats: z.array(statSchema).optional(),
}).passthrough();

const groupSchema: z.ZodType<{
  name?: string;
  displayName?: string;
  abbreviation?: string;
  standings?: { entries?: unknown[] };
  children?: unknown[];
}> = z.lazy(() => z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
  abbreviation: z.string().optional(),
  standings: z.object({
    entries: z.array(z.unknown()).optional(),
  }).passthrough().optional(),
  children: z.array(groupSchema).optional(),
}).passthrough());

const standingsSchema = z.object({
  name: z.string().optional(),
  children: z.array(groupSchema).optional(),
  standings: z.object({
    entries: z.array(z.unknown()).optional(),
  }).passthrough().optional(),
}).passthrough();

export type StandingRow = {
  teamId: string;
  team: string;
  overall: string | null;
  conference: string | null;
  gamesBehind: string | null;
  streak: string | null;
  byu: boolean;
};

export type ConferenceTable = {
  name: string;
  rows: StandingRow[];
};

function filled(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== '-' ? trimmed : null;
}

function splitStat(
  stats: { name?: string; abbreviation?: string; displayValue?: string }[],
  match: (stat: { name?: string; abbreviation?: string }) => boolean,
): { value: string | null; behind: string | null } {
  let behind: string | null = null;
  for (const stat of stats) {
    if (stat.name === 'gamesBehind' || stat.abbreviation === 'GB') {
      behind = filled(stat.displayValue);
    }
    if (match(stat)) return { value: filled(stat.displayValue), behind };
  }
  return { value: null, behind: null };
}

function rowFromEntry(entry: z.infer<typeof entrySchema>, teamId: string): StandingRow {
  const stats = entry.stats ?? [];
  const overall = splitStat(stats, (stat) => stat.abbreviation === 'overall' || stat.name === 'overall');
  const conference = splitStat(
    stats,
    (stat) => stat.abbreviation === 'CONF' || /conf/i.test(stat.name ?? '') || /conf/i.test(stat.abbreviation ?? ''),
  );
  const streak = stats.find((stat) => stat.abbreviation === 'STRK' || stat.name === 'streak');
  const team = entry.team;
  return {
    teamId: team.id,
    team: team.shortDisplayName || team.location || team.displayName || team.abbreviation || 'Team',
    overall: overall.value,
    conference: conference.value,
    gamesBehind: conference.behind ?? overall.behind,
    streak: filled(streak?.displayValue),
    byu: team.id === teamId,
  };
}

function findGroup(
  node: z.infer<typeof groupSchema> | z.infer<typeof standingsSchema>,
  teamId: string,
): { name: string; entries: z.infer<typeof entrySchema>[] } | null {
  const entries = node.standings?.entries;
  if (entries && entries.length > 0) {
    const parsed = entries
      .map((entry) => entrySchema.safeParse(entry))
      .filter((result): result is { success: true; data: z.infer<typeof entrySchema> } => result.success)
      .map((result) => result.data);
    if (parsed.some((entry) => entry.team.id === teamId)) {
      const named = node as { name?: string; displayName?: string };
      return { name: named.displayName || named.name || 'Conference', entries: parsed };
    }
  }
  for (const child of node.children ?? []) {
    const found = findGroup(child as z.infer<typeof groupSchema>, teamId);
    if (found) return found;
  }
  return null;
}

export function parseConferenceStandings(input: unknown, teamId: string): ConferenceTable | null {
  const parsed = standingsSchema.safeParse(input);
  if (!parsed.success) return null;
  const group = findGroup(parsed.data, teamId);
  if (!group) return null;
  const rows = group.entries.map((entry) => rowFromEntry(entry, teamId));
  if (!rows.some((row) => row.byu)) return null;
  return { name: group.name, rows };
}

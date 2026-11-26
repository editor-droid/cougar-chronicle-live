import { z } from 'zod';

const averageNames: { name: string; label: string }[] = [
  { name: 'totalPointsPerGame', label: 'Points per game' },
  { name: 'yardsPerGame', label: 'Yards per game' },
  { name: 'passingYardsPerGame', label: 'Passing yards per game' },
  { name: 'rushingYardsPerGame', label: 'Rushing yards per game' },
  { name: 'avgPoints', label: 'Points per game' },
  { name: 'avgRebounds', label: 'Rebounds per game' },
  { name: 'avgAssists', label: 'Assists per game' },
  { name: 'avgSteals', label: 'Steals per game' },
  { name: 'avgBlocks', label: 'Blocks per game' },
  { name: 'freeThrowPct', label: 'Free throw %' },
];

const leaderNames = new Set([
  'passingLeader',
  'rushingLeader',
  'receivingLeader',
  'totalTackles',
  'sacks',
  'interceptions',
  'pointsPerGame',
  'assistsPerGame',
  'reboundsPerGame',
  'stealsPerGame',
  'blocksPerGame',
]);

const statsSchema = z.object({
  results: z.object({
    stats: z.object({
      categories: z.array(z.object({
        stats: z.array(z.object({
          name: z.string().optional(),
          displayValue: z.string().optional(),
        }).passthrough()).optional(),
      }).passthrough()).optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

const leadersSchema = z.object({
  categories: z.array(z.object({
    name: z.string().optional(),
    displayName: z.string().optional(),
    leaders: z.array(z.object({
      displayValue: z.string().optional(),
      athlete: z.object({
        displayName: z.string().optional(),
        $ref: z.string().optional(),
      }).passthrough().optional(),
    }).passthrough()).optional(),
  }).passthrough()).optional(),
}).passthrough();

export type AverageStat = { label: string; value: string };
export type SeasonLeader = { category: string; name: string; line: string };

function filled(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseTeamAverages(input: unknown): AverageStat[] {
  const parsed = statsSchema.safeParse(input);
  if (!parsed.success) return [];
  const found = new Map<string, string>();
  for (const category of parsed.data.results?.stats?.categories ?? []) {
    for (const stat of category.stats ?? []) {
      if (!stat.name || found.has(stat.name)) continue;
      const value = filled(stat.displayValue);
      if (value) found.set(stat.name, value);
    }
  }
  const rows: AverageStat[] = [];
  for (const spec of averageNames) {
    const value = found.get(spec.name);
    if (!value) continue;
    rows.push({ label: spec.label, value });
  }
  return rows;
}

export function athleteIdFromRef(ref: string | undefined): string | null {
  if (!ref) return null;
  const match = ref.match(/\/athletes\/(\d+)/);
  return match?.[1] ?? null;
}

export function parseSeasonLeaders(input: unknown, names: Record<string, string>): SeasonLeader[] {
  const parsed = leadersSchema.safeParse(input);
  if (!parsed.success) return [];
  const categories = parsed.data.categories ?? [];
  const preferred = categories.filter((category) => category.name && leaderNames.has(category.name));
  const source = preferred.length > 0 ? preferred : categories.slice(0, 4);
  const rows: SeasonLeader[] = [];
  for (const category of source) {
    const top = category.leaders?.[0];
    const id = athleteIdFromRef(top?.athlete?.$ref);
    const name = filled(top?.athlete?.displayName) ?? (id ? filled(names[id]) : null);
    const line = filled(top?.displayValue);
    const label = filled(category.displayName) ?? filled(category.name);
    if (!name || !line || !label) continue;
    rows.push({ category: label, name, line });
    if (rows.length >= 6) break;
  }
  return rows;
}

export function leaderAthleteRefs(input: unknown): { id: string; ref: string }[] {
  const parsed = leadersSchema.safeParse(input);
  if (!parsed.success) return [];
  const categories = parsed.data.categories ?? [];
  const preferred = categories.filter((category) => category.name && leaderNames.has(category.name));
  const source = preferred.length > 0 ? preferred : categories.slice(0, 4);
  const refs: { id: string; ref: string }[] = [];
  const seen = new Set<string>();
  for (const category of source) {
    const athlete = category.leaders?.[0]?.athlete;
    if (filled(athlete?.displayName)) continue;
    const ref = athlete?.$ref;
    const id = athleteIdFromRef(ref);
    if (!ref || !id || seen.has(id)) continue;
    seen.add(id);
    refs.push({ id, ref: ref.replace(/^http:\/\//i, 'https://') });
    if (refs.length >= 6) break;
  }
  return refs;
}

export function athleteDisplayName(input: unknown): string | null {
  const parsed = z.object({ displayName: z.string().optional() }).passthrough().safeParse(input);
  if (!parsed.success) return null;
  return filled(parsed.data.displayName);
}

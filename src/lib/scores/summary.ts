import { z } from 'zod';
import { parseSiteEvent } from './parse';
import type { ScoreGame, SportKey } from './types';

const idSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

const statSchema = z.object({
  name: z.string().optional(),
  label: z.string().optional(),
  displayValue: z.string().optional(),
}).passthrough();

const teamRefSchema = z.object({
  id: idSchema.optional(),
  abbreviation: z.string().optional(),
  displayName: z.string().optional(),
  shortDisplayName: z.string().optional(),
}).passthrough();

const summarySchema = z.object({
  header: z.unknown().optional(),
  boxscore: z.object({
    teams: z.array(z.object({
      team: teamRefSchema.optional(),
      statistics: z.array(statSchema).optional(),
    }).passthrough()).optional(),
    players: z.array(z.object({
      team: teamRefSchema.optional(),
      statistics: z.array(z.object({
        name: z.string().optional(),
        text: z.string().optional(),
        labels: z.array(z.string()).optional(),
        totals: z.array(z.string()).optional(),
        athletes: z.array(z.object({
          didNotPlay: z.boolean().optional(),
          athlete: z.object({ displayName: z.string().optional() }).passthrough().optional(),
          stats: z.array(z.string()).optional(),
        }).passthrough()).optional(),
      }).passthrough()).optional(),
    }).passthrough()).optional(),
  }).passthrough().optional(),
  leaders: z.array(z.object({
    team: teamRefSchema.optional(),
    leaders: z.array(z.object({
      name: z.string().optional(),
      displayName: z.string().optional(),
      leaders: z.array(z.object({
        displayValue: z.string().optional(),
        athlete: z.object({ displayName: z.string().optional() }).passthrough().optional(),
      }).passthrough()).optional(),
    }).passthrough()).optional(),
  }).passthrough()).optional(),
  gameInfo: z.object({
    attendance: z.number().optional(),
    venue: z.object({ fullName: z.string().optional() }).passthrough().optional(),
  }).passthrough().optional(),
  pickcenter: z.array(z.object({
    details: z.string().optional(),
    overUnder: z.union([z.number(), z.string()]).optional(),
  }).passthrough()).optional(),
}).passthrough();

const headerSchema = z.object({
  competitions: z.array(z.object({
    competitors: z.array(z.object({
      id: idSchema,
      homeAway: z.string().optional(),
      team: teamRefSchema.optional(),
      linescores: z.array(z.object({ displayValue: z.string().optional() }).passthrough()).optional(),
      record: z.array(z.object({
        type: z.string().optional(),
        summary: z.string().optional(),
        displayValue: z.string().optional(),
      }).passthrough()).optional(),
    }).passthrough()).min(2),
  }).passthrough()).min(1),
}).passthrough();

export type LinescoreRow = { label: string; byu: string; opponent: string };
export type StatRow = { label: string; byu: string; opponent: string };
export type BoxRow = { name: string; stats: string[] };
export type BoxGroup = { title: string; labels: string[]; rows: BoxRow[] };
export type BoxSide = { name: string; groups: BoxGroup[] };
export type Performer = { side: 'byu' | 'opponent'; category: string; name: string; line: string };

export type GameSummary = {
  game: ScoreGame;
  byuRecord: string | null;
  opponentRecord: string | null;
  attendance: number | null;
  line: string | null;
  overUnder: number | null;
  linescores: LinescoreRow[];
  teamStats: StatRow[];
  box: BoxSide[];
  performers: Performer[];
};

const TEAM_STAT_NAMES: Record<SportKey, string[]> = {
  football: [
    'firstDowns',
    'totalYards',
    'netPassingYards',
    'completionAttempts',
    'rushingYards',
    'thirdDownEff',
    'turnovers',
    'totalPenaltiesYards',
    'possessionTime',
  ],
  'mens-basketball': [
    'fieldGoalsMade-fieldGoalsAttempted',
    'fieldGoalPct',
    'threePointFieldGoalsMade-threePointFieldGoalsAttempted',
    'threePointFieldGoalPct',
    'freeThrowsMade-freeThrowsAttempted',
    'totalRebounds',
    'assists',
    'turnovers',
  ],
  'womens-basketball': [
    'fieldGoalsMade-fieldGoalsAttempted',
    'fieldGoalPct',
    'threePointFieldGoalsMade-threePointFieldGoalsAttempted',
    'threePointFieldGoalPct',
    'freeThrowsMade-freeThrowsAttempted',
    'totalRebounds',
    'assists',
    'turnovers',
  ],
  'womens-soccer': ['possessionPct', 'shotsOnTarget', 'shots', 'saves', 'foulsCommitted'],
};

function filled(value: string | undefined | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickcenterLine(
  pickcenter: { details?: string; overUnder?: number | string }[] | undefined,
): { line: string | null; overUnder: number | null } {
  const first = pickcenter?.[0];
  if (!first) return { line: null, overUnder: null };
  const raw = first.overUnder;
  let overUnder: number | null = null;
  if (typeof raw === 'number' && Number.isFinite(raw)) overUnder = raw;
  else if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) overUnder = parsed;
  }
  return { line: filled(first.details), overUnder };
}

function teamIdOf(competitor: { id: string; team?: { id?: string } }): string {
  return competitor.team?.id || competitor.id;
}

function periodLabels(count: number, sport: SportKey): string[] {
  return Array.from({ length: count }, (_, index) => {
    if (sport === 'football' || sport === 'womens-basketball') {
      if (index < 4) return `Q${index + 1}`;
      return index === 4 ? 'OT' : `${index - 3}OT`;
    }
    if (sport === 'womens-soccer') {
      if (index === 0) return '1st';
      if (index === 1) return '2nd';
      return index === 2 ? 'ET' : 'PK';
    }
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    return index === 2 ? 'OT' : `${index - 1}OT`;
  });
}

function totalRecord(record: { type?: string; summary?: string; displayValue?: string }[] | undefined): string | null {
  if (!record) return null;
  const total = record.find((item) => item.type === 'total') ?? record[0];
  return filled(total?.summary) ?? filled(total?.displayValue);
}

function statRows(
  sport: SportKey,
  us: { statistics?: { name?: string; label?: string; displayValue?: string }[] } | undefined,
  them: { statistics?: { name?: string; label?: string; displayValue?: string }[] } | undefined,
): StatRow[] {
  const ours = us?.statistics ?? [];
  const theirs = new Map((them?.statistics ?? []).map((stat) => [stat.name, filled(stat.displayValue)]));
  const preferred = TEAM_STAT_NAMES[sport];
  const rank = new Map(preferred.map((name, index) => [name, index]));
  const chosen = ours
    .filter((stat) => stat.name && rank.has(stat.name))
    .sort((a, b) => (rank.get(a.name ?? '') ?? 0) - (rank.get(b.name ?? '') ?? 0));
  const source = chosen.length > 0 ? chosen : ours.slice(0, 8);
  const rows: StatRow[] = [];
  for (const stat of source) {
    const byu = filled(stat.displayValue);
    const opponent = stat.name ? theirs.get(stat.name) ?? null : null;
    const label = filled(stat.label) ?? filled(stat.name);
    if (!byu || !opponent || !label) continue;
    rows.push({ label, byu, opponent });
  }
  return rows;
}

type PlayerSide = {
  team?: { id?: string; abbreviation?: string; shortDisplayName?: string };
  statistics?: {
    name?: string;
    text?: string;
    labels?: string[];
    totals?: string[];
    athletes?: {
      didNotPlay?: boolean;
      athlete?: { displayName?: string };
      stats?: string[];
    }[];
  }[];
};

function boxSides(players: PlayerSide[] | undefined, teamId: string): BoxSide[] {
  if (!players) return [];
  const sides: BoxSide[] = [];
  const ordered = [...players].sort((a, b) => {
    const aByu = (a.team?.id || '') === teamId ? 0 : 1;
    const bByu = (b.team?.id || '') === teamId ? 0 : 1;
    return aByu - bByu;
  });
  for (const side of ordered) {
    const groups: BoxGroup[] = [];
    for (const group of side.statistics ?? []) {
      const labels = (group.labels ?? []).map((label) => label.trim()).filter(Boolean);
      if (labels.length === 0) continue;
      const rows: BoxRow[] = [];
      for (const athlete of group.athletes ?? []) {
        if (athlete.didNotPlay) continue;
        const name = filled(athlete.athlete?.displayName);
        const stats = (athlete.stats ?? []).map((stat) => stat.trim());
        if (!name || stats.length === 0 || stats.every((stat) => stat === '')) continue;
        rows.push({ name, stats });
      }
      const totals = (group.totals ?? []).map((stat) => stat.trim()).filter(Boolean);
      if (totals.length === labels.length) rows.push({ name: 'Total', stats: totals });
      if (rows.length === 0) continue;
      const title = filled(group.text) ?? filled(group.name) ?? (labels.includes('PTS') ? 'Scoring' : 'Players');
      groups.push({ title, labels, rows });
    }
    if (groups.length === 0) continue;
    sides.push({
      name: filled(side.team?.shortDisplayName) ?? filled(side.team?.abbreviation) ?? 'Team',
      groups,
    });
  }
  return sides;
}

function performersOf(
  leaders: z.infer<typeof summarySchema>['leaders'],
  teamId: string,
): Performer[] {
  if (!leaders) return [];
  const rows: Performer[] = [];
  for (const side of leaders) {
    const sideName: Performer['side'] = side.team?.id === teamId ? 'byu' : 'opponent';
    for (const category of side.leaders ?? []) {
      const top = category.leaders?.[0];
      const name = filled(top?.athlete?.displayName);
      const line = filled(top?.displayValue);
      const label = filled(category.displayName) ?? filled(category.name);
      if (!name || !line || !label) continue;
      rows.push({ side: sideName, category: label, name, line });
    }
  }
  return rows.slice(0, 8);
}

export function parseGameSummary(
  input: unknown,
  options: { teamId: string; eventDate: string; sport: SportKey },
): GameSummary | null {
  const parsed = summarySchema.safeParse(input);
  if (!parsed.success || !parsed.data.header) return null;
  const game = parseSiteEvent(parsed.data.header, {
    teamId: options.teamId,
    source: 'summary',
    eventDate: options.eventDate,
  });
  if (!game) return null;

  const header = headerSchema.safeParse(parsed.data.header);
  let byuRecord: string | null = null;
  let opponentRecord: string | null = null;
  const linescores: LinescoreRow[] = [];
  if (header.success) {
    const competitors = header.data.competitions[0].competitors;
    const us = competitors.find((competitor) => teamIdOf(competitor) === options.teamId);
    const them = competitors.find((competitor) => competitor !== us);
    if (us && them) {
      byuRecord = totalRecord(us.record);
      opponentRecord = totalRecord(them.record);
      const ours = (us.linescores ?? []).map((item) => filled(item.displayValue));
      const theirs = (them.linescores ?? []).map((item) => filled(item.displayValue));
      if (ours.length > 0 && ours.length === theirs.length && ours.every(Boolean) && theirs.every(Boolean)) {
        const labels = periodLabels(ours.length, options.sport);
        ours.forEach((value, index) => {
          const opponent = theirs[index];
          if (!value || !opponent) return;
          linescores.push({ label: labels[index] ?? `${index + 1}`, byu: value, opponent });
        });
      }
    }
  }

  const teams = parsed.data.boxscore?.teams ?? [];
  const usTeam = teams.find((team) => team.team?.id === options.teamId);
  const themTeam = teams.find((team) => team !== usTeam);
  const attendance = parsed.data.gameInfo?.attendance;
  const { line, overUnder } = pickcenterLine(parsed.data.pickcenter);
  return {
    game,
    byuRecord,
    opponentRecord,
    attendance: typeof attendance === 'number' && attendance > 0 ? Math.round(attendance) : null,
    line,
    overUnder,
    linescores,
    teamStats: statRows(options.sport, usTeam, themTeam),
    box: boxSides(parsed.data.boxscore?.players, options.teamId),
    performers: performersOf(parsed.data.leaders, options.teamId),
  };
}

/** Schedule facts stay; a summary fills in the live score and anything the schedule omitted. */
export function mergeScheduleGame(schedule: ScoreGame, summary: ScoreGame | null): ScoreGame {
  if (!summary) return schedule;
  return {
    ...schedule,
    state: summary.state,
    statusText: summary.statusText || schedule.statusText,
    clock: summary.clock ?? schedule.clock,
    period: summary.period ?? schedule.period,
    byuScore: summary.byuScore ?? schedule.byuScore,
    opponentScore: summary.opponentScore ?? schedule.opponentScore,
    byuWinner: summary.byuWinner ?? schedule.byuWinner,
    tv: summary.tv ?? schedule.tv,
    venue: summary.venue ?? schedule.venue,
    byuRank: summary.byuRank ?? schedule.byuRank,
    opponentRank: summary.opponentRank ?? schedule.opponentRank,
    neutral: schedule.neutral || summary.neutral,
  };
}

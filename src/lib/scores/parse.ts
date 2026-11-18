import { z } from 'zod';
import type { GameState, ScoreGame } from './types';

const idSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

const scoreSchema = z.union([
  z.string(),
  z.number(),
  z.object({
    displayValue: z.string().optional(),
    value: z.number().optional(),
  }).passthrough(),
  z.null(),
]);

const teamSchema = z.object({
  id: idSchema.optional(),
  abbreviation: z.string().optional(),
  shortDisplayName: z.string().optional(),
  displayName: z.string().optional(),
  location: z.string().optional(),
  name: z.string().optional(),
}).passthrough();

const competitorSchema = z.object({
  id: idSchema,
  homeAway: z.string().optional(),
  winner: z.boolean().nullable().optional(),
  score: scoreSchema.optional(),
  curatedRank: z.object({ current: z.number().optional() }).passthrough().nullable().optional(),
  team: teamSchema.optional(),
}).passthrough();

const statusSchema = z.object({
  displayClock: z.string().optional(),
  period: z.number().optional(),
  type: z.object({
    state: z.string(),
    completed: z.boolean().optional(),
    name: z.string().optional(),
    shortDetail: z.string().optional(),
    detail: z.string().optional(),
    description: z.string().optional(),
  }).passthrough(),
}).passthrough();

const competitionSchema = z.object({
  date: z.string().optional(),
  neutralSite: z.boolean().optional(),
  venue: z.object({ fullName: z.string().optional() }).passthrough().nullable().optional(),
  competitors: z.array(competitorSchema).min(2),
  status: statusSchema,
  broadcasts: z.unknown().optional(),
  geoBroadcasts: z.unknown().optional(),
}).passthrough();

/** Site schedule event, scoreboard event, or summary header. */
export const siteEventSchema = z.object({
  id: idSchema,
  date: z.string().optional(),
  name: z.string().optional(),
  shortName: z.string().optional(),
  competitions: z.array(competitionSchema).min(1),
  links: z.unknown().optional(),
}).passthrough();

export const coreEventSchema = z.object({
  id: idSchema,
  date: z.string(),
  name: z.string().optional(),
  shortName: z.string().optional(),
  competitions: z.array(z.object({
    date: z.string().optional(),
    neutralSite: z.boolean().optional(),
    venue: z.object({ fullName: z.string().optional() }).passthrough().nullable().optional(),
    competitors: z.array(z.object({
      id: idSchema,
      homeAway: z.string().optional(),
      winner: z.boolean().nullable().optional(),
      score: z.unknown().optional(),
    }).passthrough()).min(2),
    status: z.unknown().optional(),
    broadcasts: z.unknown().optional(),
  }).passthrough()).min(1),
  links: z.unknown().optional(),
}).passthrough();

export const statusResponseSchema = statusSchema;

export const eventsIndexSchema = z.object({
  pageCount: z.number().optional(),
  items: z.array(z.object({ $ref: z.string() }).passthrough()).optional(),
}).passthrough();

export const scheduleDocumentSchema = z.object({
  team: z.object({
    recordSummary: z.string().nullable().optional(),
    standingSummary: z.string().nullable().optional(),
  }).passthrough().optional(),
  events: z.array(z.unknown()).optional(),
}).passthrough();

export const scoreboardSchema = z.object({
  events: z.array(z.unknown()).optional(),
}).passthrough();

export type DateSource = 'summary' | 'event' | 'scoreboard';

/**
 * Summary `header.competitions[].date` is wrong. Callers that hydrated a
 * summary must pass the core event date (or a scoreboard date) and we ignore
 * the competition date. Event and scoreboard payloads may fall back to it.
 */
export function resolveEventDate(
  eventDate: string | undefined,
  competitionDate: string | undefined,
  source: DateSource
): string | null {
  if (source === 'summary') return normalizeIso(eventDate);
  return normalizeIso(eventDate) ?? normalizeIso(competitionDate);
}

function normalizeIso(value: string | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function ranked(current: number | undefined): number | null {
  if (typeof current !== 'number' || !Number.isInteger(current)) return null;
  if (current < 1 || current > 25) return null;
  return current;
}

function scoreText(score: z.infer<typeof scoreSchema> | undefined): string | null {
  if (score == null) return null;
  if (typeof score === 'string') {
    const trimmed = score.trim();
    return trimmed && trimmed !== '0' ? trimmed : trimmed === '0' ? '0' : null;
  }
  if (typeof score === 'number' && Number.isFinite(score)) return String(Math.round(score));
  if (typeof score === 'object') {
    if (score.displayValue && score.displayValue.trim()) return score.displayValue.trim();
    if (typeof score.value === 'number' && Number.isFinite(score.value)) return String(Math.round(score.value));
  }
  return null;
}

function gameState(status: z.infer<typeof statusSchema>): GameState {
  const description = `${status.type.description ?? ''} ${status.type.name ?? ''}`;
  if (/postponed|canceled|cancelled/i.test(description) && status.type.state !== 'in') return 'pre';
  if (status.type.state === 'in') return 'in';
  if (status.type.state === 'post' || status.type.completed) return 'post';
  return 'pre';
}

function dropMascot(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return full.trim();
  return parts.slice(0, -1).join(' ');
}

type Cast = { name: string; kind: 'tv' | 'other' };

function addCast(list: Cast[], name: string | undefined, kind: 'tv' | 'other') {
  const trimmed = name?.trim();
  if (!trimmed) return;
  if (list.some((item) => item.name.toLowerCase() === trimmed.toLowerCase())) return;
  list.push({ name: trimmed, kind });
}

function walkBroadcasts(value: unknown, list: Cast[], depth: number) {
  if (depth > 5 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) walkBroadcasts(item, list, depth + 1);
    return;
  }
  if (typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.items)) walkBroadcasts(record.items, list, depth + 1);

  const type = record.type;
  const typeName = type && typeof type === 'object'
    ? String((type as { shortName?: unknown }).shortName ?? '')
    : '';
  const kind: 'tv' | 'other' = /tv/i.test(typeName) || typeName === '' && Array.isArray(record.names)
    ? 'tv'
    : 'other';
  const media = record.media;
  const mediaName = media && typeof media === 'object'
    ? (media as { shortName?: unknown }).shortName
    : undefined;
  if (typeof mediaName === 'string') addCast(list, mediaName, /tv/i.test(typeName) ? 'tv' : 'other');
  if (typeof record.station === 'string') addCast(list, record.station, /tv/i.test(typeName) ? 'tv' : 'other');
  if (Array.isArray(record.names)) {
    for (const name of record.names) {
      if (typeof name === 'string') addCast(list, name, kind === 'tv' || typeName === '' ? 'tv' : 'other');
    }
  }
}

export function tvFromBroadcasts(...sources: unknown[]): string | null {
  const casts: Cast[] = [];
  for (const source of sources) walkBroadcasts(source, casts, 0);
  const tvs = casts.filter((cast) => cast.kind === 'tv');
  const chosen = (tvs.length > 0 ? tvs : casts).slice(0, 2);
  return chosen.length > 0 ? chosen.map((cast) => cast.name).join(' / ') : null;
}

export function findStatBroadcastUrl(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  if (typeof value === 'string') {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return null;
      if (!/(^|\.)statbroadcast\.com$/i.test(url.hostname)) return null;
      return url.toString();
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStatBroadcastUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = findStatBroadcastUrl(nested, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export type ParseSiteOptions = {
  teamId: string;
  source: DateSource;
  /** Required for `source: 'summary'`. Ignored competition dates. */
  eventDate?: string;
};

export function parseSiteEvent(input: unknown, options: ParseSiteOptions): ScoreGame | null {
  const parsed = siteEventSchema.safeParse(input);
  if (!parsed.success) return null;
  const event = parsed.data;
  const competition = event.competitions[0];
  const start = resolveEventDate(
    options.source === 'summary' ? options.eventDate : event.date ?? options.eventDate,
    competition.date,
    options.source
  );
  if (!start) return null;

  const teamId = options.teamId;
  const us = competition.competitors.find((competitor) => competitor.id === teamId || competitor.team?.id === teamId);
  const them = competition.competitors.find((competitor) => competitor !== us);
  if (!us || !them) return null;

  const homeAway = us.homeAway === 'away' ? 'away' : 'home';
  const opponent = them.team?.shortDisplayName
    || them.team?.location
    || (them.team?.displayName ? dropMascot(them.team.displayName) : null)
    || them.team?.abbreviation
    || 'Opponent';

  const state = gameState(competition.status);
  const clock = competition.status.displayClock && competition.status.displayClock !== '0:00'
    ? competition.status.displayClock
    : null;

  return {
    id: event.id,
    start,
    state,
    statusText: competition.status.type.shortDetail
      || competition.status.type.detail
      || competition.status.type.description
      || '',
    clock: state === 'in' ? clock : null,
    period: state === 'in' && typeof competition.status.period === 'number' ? competition.status.period : null,
    homeAway,
    neutral: Boolean(competition.neutralSite),
    opponent,
    opponentAbbrev: them.team?.abbreviation || opponent,
    opponentRank: ranked(them.curatedRank?.current),
    byuScore: scoreText(us.score),
    opponentScore: scoreText(them.score),
    byuWinner: typeof us.winner === 'boolean' ? us.winner : null,
    byuRank: ranked(us.curatedRank?.current),
    tv: tvFromBroadcasts(competition.geoBroadcasts, competition.broadcasts),
    venue: competition.venue?.fullName ?? null,
    statBroadcastUrl: findStatBroadcastUrl(event.links) ?? findStatBroadcastUrl(competition),
  };
}

export function parseHydratedCoreEvent(input: {
  event: unknown;
  status: unknown;
  scores: Record<string, unknown>;
  broadcasts: unknown;
  teamId: string;
}): ScoreGame | null {
  const eventParsed = coreEventSchema.safeParse(input.event);
  const statusParsed = statusResponseSchema.safeParse(input.status);
  if (!eventParsed.success || !statusParsed.success) return null;

  const event = eventParsed.data;
  const competition = event.competitions[0];
  // Core event `date` is the kickoff. Do not read competitions[].date.
  const start = resolveEventDate(event.date, competition.date, 'summary');
  if (!start) return null;

  const us = competition.competitors.find((competitor) => competitor.id === input.teamId);
  const them = competition.competitors.find((competitor) => competitor !== us);
  if (!us || !them) return null;

  const homeAway = us.homeAway === 'away' ? 'away' : 'home';
  const names = opponentFromName(event.name, event.shortName);
  const state = gameState(statusParsed.data);
  const clock = statusParsed.data.displayClock && statusParsed.data.displayClock !== '0:00'
    ? statusParsed.data.displayClock
    : null;

  const byuScore = scoreText(normalizeScore(input.scores[us.id]));
  const opponentScore = scoreText(normalizeScore(input.scores[them.id]));

  return {
    id: event.id,
    start,
    state,
    statusText: statusParsed.data.type.shortDetail
      || statusParsed.data.type.detail
      || statusParsed.data.type.description
      || '',
    clock: state === 'in' ? clock : null,
    period: state === 'in' && typeof statusParsed.data.period === 'number' ? statusParsed.data.period : null,
    homeAway,
    neutral: Boolean(competition.neutralSite),
    opponent: names.name,
    opponentAbbrev: names.abbrev,
    opponentRank: null,
    byuScore,
    opponentScore,
    byuWinner: typeof us.winner === 'boolean' ? us.winner : null,
    byuRank: null,
    tv: tvFromBroadcasts(input.broadcasts),
    venue: competition.venue?.fullName ?? null,
    statBroadcastUrl: findStatBroadcastUrl(event.links),
  };
}

function normalizeScore(value: unknown): z.infer<typeof scoreSchema> | undefined {
  const parsed = scoreSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function opponentFromName(name: string | undefined, shortName: string | undefined): { name: string; abbrev: string } {
  let abbrev = '';
  const short = shortName?.match(/^(.+?)\s+(?:@|vs\.?)\s+(.+)$/i);
  if (short) {
    const left = short[1].trim();
    const right = short[2].trim();
    abbrev = left.toUpperCase() === 'BYU' ? right : left;
  }
  let opponent = abbrev;
  const full = name?.match(/^(.+?)\s+(?:at|vs\.?)\s+(.+)$/i);
  if (full) {
    const left = full[1].trim();
    const right = full[2].trim();
    const side = /byu/i.test(left) ? right : left;
    opponent = dropMascot(side);
  }
  return {
    name: opponent || 'Opponent',
    abbrev: abbrev || (opponent ? opponent.slice(0, 4).toUpperCase() : 'OPP'),
  };
}

export function blankToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

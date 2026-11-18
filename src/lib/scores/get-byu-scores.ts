import { unstable_cache } from 'next/cache';
import { buildSport, chooseRevalidateSeconds } from './assemble';
import {
  BASKETBALL_PATH,
  BYU_TEAM_ID,
  BYU_WSOC_TEAM_ID,
  COLD_REVALIDATE_SECONDS,
  ESPN_CORE,
  ESPN_SITE,
  FOOTBALL_PATH,
  HOT_REVALIDATE_SECONDS,
  SCHEDULE_URL,
  WOMENS_BASKETBALL_PATH,
  WOMENS_SOCCER_PATH,
} from './constants';
import { espnJson, mapPool, toHttps, type FetchCtx } from './espn';
import { denverYmd, footballSeasonYear } from './format';
import {
  blankToNull,
  coreEventSchema,
  eventsIndexSchema,
  parseHydratedCoreEvent,
  parseSiteEvent,
  scheduleDocumentSchema,
  scoreboardSchema,
  statusResponseSchema,
} from './parse';
import type { ByuScoresPayload, ScoreGame, SportKey, SportScores } from './types';

const RECENT_MS = 10_000;

let memory: { payload: ByuScoresPayload; freshUntil: number } | null = null;
let recent: { at: number; payload: ByuScoresPayload } | null = null;

const loadCold = unstable_cache(
  async () => buildByuScores(),
  ['byu-scores-cold-v2'],
  { revalidate: COLD_REVALIDATE_SECONDS, tags: ['byu-scores'] }
);

const loadHot = unstable_cache(
  async () => buildByuScores(),
  ['byu-scores-hot-v2'],
  { revalidate: HOT_REVALIDATE_SECONDS, tags: ['byu-scores'] }
);

/** Shorten the route's ISR window while a game is live or about to start. */
const pinHot = unstable_cache(
  async () => 'hot' as const,
  ['byu-scores-pin-hot-v1'],
  { revalidate: HOT_REVALIDATE_SECONDS, tags: ['byu-scores'] }
);

const retrySoon = unstable_cache(
  async () => Date.now(),
  ['byu-scores-retry-v1'],
  { revalidate: 60, tags: ['byu-scores'] }
);

function remember(payload: ByuScoresPayload, now: number) {
  memory = { payload, freshUntil: now + payload.revalidateSeconds * 1000 };
}

function ageStamp(payload: ByuScoresPayload, now: number): ByuScoresPayload {
  const updated = Date.parse(payload.updatedAt);
  const age = Number.isFinite(updated) ? (now - updated) / 1000 : Number.POSITIVE_INFINITY;
  const revalidateSeconds = chooseRevalidateSeconds(sportBlocks(payload), now);
  const stale = payload.stale || age > revalidateSeconds + 15;
  return { ...payload, revalidateSeconds, stale };
}

export async function getByuScores(now = Date.now()): Promise<ByuScoresPayload | null> {
  if (memory && now < memory.freshUntil) {
    const viewed = ageStamp(memory.payload, now);
    if (viewed.revalidateSeconds === HOT_REVALIDATE_SECONDS) await pinHot();
    return viewed;
  }

  try {
    const cold = ageStamp(await loadCold(), now);
    if (cold.revalidateSeconds !== HOT_REVALIDATE_SECONDS) {
      remember(cold, now);
      return cold;
    }
    const hot = ageStamp(await loadHot(), now);
    remember(hot, now);
    return hot;
  } catch (error) {
    console.error(
      '[byu-scores] refresh failed',
      error instanceof Error ? error.message : 'error'
    );
    if (memory) return { ...memory.payload, stale: true };
    try {
      await retrySoon();
    } catch {
      /* route still answers */
    }
    return null;
  }
}

async function buildByuScores(): Promise<ByuScoresPayload> {
  const now = Date.now();
  if (recent && now - recent.at < RECENT_MS) return recent.payload;

  const [footballResult, basketballResult, womensBasketballResult, soccerResult] = await Promise.all([
    loadFootball(now),
    loadScheduleSport(now, {
      key: 'mens-basketball',
      label: "Men's Basketball",
      path: BASKETBALL_PATH,
      teamId: BYU_TEAM_ID,
      scheduleUrl: SCHEDULE_URL['mens-basketball'],
    }),
    loadScheduleSport(now, {
      key: 'womens-basketball',
      label: "Women's Basketball",
      path: WOMENS_BASKETBALL_PATH,
      teamId: BYU_TEAM_ID,
      scheduleUrl: SCHEDULE_URL['womens-basketball'],
    }),
    loadScheduleSport(now, {
      key: 'womens-soccer',
      label: "Women's Soccer",
      path: WOMENS_SOCCER_PATH,
      teamId: BYU_WSOC_TEAM_ID,
      scheduleUrl: SCHEDULE_URL['womens-soccer'],
    }),
  ]);

  const results = [footballResult, basketballResult, womensBasketballResult, soccerResult];
  if (!results.some((result) => result?.block)) {
    throw new Error('ESPN returned no BYU scores');
  }

  const payload: ByuScoresPayload = {
    updatedAt: new Date(now).toISOString(),
    stale: results.some((result) => result?.stale),
    revalidateSeconds: COLD_REVALIDATE_SECONDS,
    football: footballResult?.block ?? null,
    basketball: basketballResult?.block ?? null,
    womensBasketball: womensBasketballResult?.block ?? null,
    soccer: soccerResult?.block ?? null,
  };
  payload.revalidateSeconds = chooseRevalidateSeconds(sportBlocks(payload), now);
  recent = { at: Date.now(), payload };
  return payload;
}

async function loadFootball(now: number): Promise<{ block: SportScores | null; stale: boolean } | null> {
  const ctx: FetchCtx = { stale: false };
  try {
    const year = footballSeasonYear(new Date(now));
    let refs = await fetchEventRefs(year, ctx).catch(() => [] as string[]);
    if (refs.length === 0) refs = await fetchEventRefs(year - 1, ctx).catch(() => [] as string[]);

    const hydrated = await mapPool(refs, 5, (ref) => hydrateFootballEvent(ref, ctx));
    let games = hydrated.filter((game): game is ScoreGame => game !== null);

    let record: string | null = null;
    let standing: string | null = null;
    try {
      const schedule = await espnJson(
        `${ESPN_SITE}/${FOOTBALL_PATH}/teams/${BYU_TEAM_ID}/schedule`,
        ctx
      );
      const parsed = scheduleDocumentSchema.safeParse(schedule);
      if (parsed.success) {
        record = blankToNull(parsed.data.team?.recordSummary);
        standing = blankToNull(parsed.data.team?.standingSummary);
        games = overlaySite(games, parsed.data.events ?? [], BYU_TEAM_ID);
      }
    } catch {
      ctx.stale = games.length > 0;
    }

    games = await mergeScoreboard(games, FOOTBALL_PATH, BYU_TEAM_ID, ctx, now);
    const block = buildSport({
      key: 'football',
      label: 'Football',
      games,
      record,
      standing,
      scheduleUrl: SCHEDULE_URL.football,
    });
    return { block, stale: ctx.stale };
  } catch (error) {
    console.error('[byu-scores] football', error instanceof Error ? error.message : 'error');
    return null;
  }
}

async function loadScheduleSport(
  now: number,
  spec: {
    key: SportKey;
    label: string;
    path: string;
    teamId: string;
    scheduleUrl: string;
  }
): Promise<{ block: SportScores | null; stale: boolean } | null> {
  const ctx: FetchCtx = { stale: false };
  try {
    let games: ScoreGame[] = [];
    let record: string | null = null;
    let standing: string | null = null;
    const schedule = await espnJson(
      `${ESPN_SITE}/${spec.path}/teams/${spec.teamId}/schedule`,
      ctx
    );
    const parsed = scheduleDocumentSchema.safeParse(schedule);
    if (parsed.success) {
      record = blankToNull(parsed.data.team?.recordSummary);
      standing = blankToNull(parsed.data.team?.standingSummary);
      games = overlaySite([], parsed.data.events ?? [], spec.teamId);
    }
    games = await mergeScoreboard(games, spec.path, spec.teamId, ctx, now);
    const block = buildSport({
      key: spec.key,
      label: spec.label,
      games,
      record,
      standing,
      scheduleUrl: spec.scheduleUrl,
    });
    return { block, stale: ctx.stale };
  } catch (error) {
    console.error(`[byu-scores] ${spec.key}`, error instanceof Error ? error.message : 'error');
    return null;
  }
}

async function fetchEventRefs(year: number, ctx: FetchCtx): Promise<string[]> {
  const refs: string[] = [];
  let page = 1;
  let pageCount = 1;
  do {
    const json = await espnJson(
      `${ESPN_CORE}/football/leagues/college-football/seasons/${year}/teams/${BYU_TEAM_ID}/events?page=${page}`,
      ctx
    );
    const parsed = eventsIndexSchema.safeParse(json);
    if (!parsed.success) break;
    pageCount = parsed.data.pageCount ?? 1;
    for (const item of parsed.data.items ?? []) refs.push(item.$ref);
    page += 1;
  } while (page <= pageCount && page <= 4);
  return refs;
}

async function hydrateFootballEvent(ref: string, ctx: FetchCtx): Promise<ScoreGame | null> {
  try {
    const event = await espnJson(toHttps(ref), ctx);
    const parsed = coreEventSchema.safeParse(event);
    if (!parsed.success) return null;
    const competition = parsed.data.competitions[0];
    const status = await resolveRef(competition.status, ctx);
    const statusParsed = statusResponseSchema.safeParse(status);
    const scores: Record<string, unknown> = {};
    const needsScore = statusParsed.success && (
      statusParsed.data.type.state === 'in' ||
      statusParsed.data.type.state === 'post' ||
      statusParsed.data.type.completed
    );
    if (needsScore) {
      await Promise.all(competition.competitors.map(async (competitor) => {
        scores[competitor.id] = await resolveRef(competitor.score, ctx);
      }));
    }
    const broadcasts = await resolveRef(competition.broadcasts, ctx);
    return parseHydratedCoreEvent({
      event,
      status,
      scores,
      broadcasts,
      teamId: BYU_TEAM_ID,
    });
  } catch {
    return null;
  }
}

async function resolveRef(value: unknown, ctx: FetchCtx): Promise<unknown> {
  if (
    value &&
    typeof value === 'object' &&
    '$ref' in value &&
    typeof (value as { $ref: unknown }).$ref === 'string'
  ) {
    return espnJson(toHttps((value as { $ref: string }).$ref), ctx);
  }
  return value;
}

function sportBlocks(payload: ByuScoresPayload): Array<SportScores | null> {
  return [payload.football, payload.basketball, payload.womensBasketball, payload.soccer];
}

function overlaySite(games: ScoreGame[], events: unknown[], teamId: string): ScoreGame[] {
  const byId = new Map(games.map((game) => [game.id, game]));
  for (const raw of events) {
    const parsed = parseSiteEvent(raw, { teamId, source: 'event' });
    if (!parsed) continue;
    const prev = byId.get(parsed.id);
    if (!prev) {
      byId.set(parsed.id, parsed);
      continue;
    }
    byId.set(parsed.id, {
      ...prev,
      opponent: parsed.opponent || prev.opponent,
      opponentAbbrev: parsed.opponentAbbrev || prev.opponentAbbrev,
      opponentRank: parsed.opponentRank ?? prev.opponentRank,
      byuRank: parsed.byuRank ?? prev.byuRank,
      tv: parsed.tv ?? prev.tv,
      venue: parsed.venue ?? prev.venue,
      neutral: parsed.neutral || prev.neutral,
      homeAway: parsed.homeAway,
      start: prev.start || parsed.start,
      statBroadcastUrl: parsed.statBroadcastUrl ?? prev.statBroadcastUrl,
    });
  }
  return [...byId.values()];
}

async function mergeScoreboard(
  games: ScoreGame[],
  sportPath: string,
  teamId: string,
  ctx: FetchCtx,
  now: number
): Promise<ScoreGame[]> {
  const dates = extraDates(games, now);
  const urls = [
    `${ESPN_SITE}/${sportPath}/scoreboard`,
    ...dates.map((date) => `${ESPN_SITE}/${sportPath}/scoreboard?dates=${date}`),
  ];
  const events: unknown[] = [];
  for (const url of urls) {
    try {
      const json = await espnJson(url, ctx);
      const parsed = scoreboardSchema.safeParse(json);
      if (parsed.success && parsed.data.events) events.push(...parsed.data.events);
    } catch {
      /* scoreboard is optional when the schedule already loaded */
    }
  }

  const byId = new Map(games.map((game) => [game.id, game]));
  for (const raw of events) {
    const parsed = parseSiteEvent(raw, { teamId, source: 'scoreboard' });
    if (!parsed) continue;
    const prev = byId.get(parsed.id);
    if (!prev) {
      byId.set(parsed.id, parsed);
      continue;
    }
    byId.set(parsed.id, {
      ...prev,
      state: parsed.state,
      statusText: parsed.statusText || prev.statusText,
      clock: parsed.clock ?? prev.clock,
      period: parsed.period ?? prev.period,
      byuScore: parsed.byuScore ?? prev.byuScore,
      opponentScore: parsed.opponentScore ?? prev.opponentScore,
      byuWinner: parsed.byuWinner ?? prev.byuWinner,
      tv: parsed.tv ?? prev.tv,
      start: prev.start || parsed.start,
      statBroadcastUrl: parsed.statBroadcastUrl ?? prev.statBroadcastUrl,
    });
  }
  return [...byId.values()];
}

function extraDates(games: ScoreGame[], now: number): string[] {
  const today = denverYmd(new Date(now).toISOString());
  const dates = new Set<string>();
  for (const game of games) {
    if (game.state === 'post') continue;
    const start = Date.parse(game.start);
    if (!Number.isFinite(start)) continue;
    if (start - now > 6 * 60 * 60 * 1000 || now - start > 3 * 60 * 60 * 1000) continue;
    const ymd = denverYmd(game.start);
    if (ymd && ymd !== today) dates.add(ymd);
  }
  return [...dates];
}

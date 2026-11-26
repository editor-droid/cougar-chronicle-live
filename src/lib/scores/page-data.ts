import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { COLD_REVALIDATE_SECONDS, HOT_REVALIDATE_SECONDS, HOT_WINDOW_MS } from './constants';
import { espnJson, mapPool, type FetchCtx } from './espn';
import { getByuScores } from './get-byu-scores';
import { leadersUrl, SPORT_SPECS, standingsUrl, statisticsUrl, summaryUrl } from './paths';
import {
  athleteDisplayName,
  leaderAthleteRefs,
  parseSeasonLeaders,
  parseTeamAverages,
  type AverageStat,
  type SeasonLeader,
} from './season';
import { parseConferenceStandings, type ConferenceTable } from './standings';
import { mergeScheduleGame, parseGameSummary, type GameSummary } from './summary';
import type { ByuScoresPayload, ScoreGame, SportKey, SportScores } from './types';

/** Raw standings documents are several megabytes, over the data-cache limit. Parse first. */
async function espnFresh(url: string): Promise<unknown | null> {
  try {
    const ctx: FetchCtx = { stale: false };
    return await espnJson(url, ctx, { store: false });
  } catch (error) {
    console.error('[byu-scores] doc', error instanceof Error ? error.message : 'error');
    return null;
  }
}

async function loadSummary(sport: SportKey, eventId: string, eventDate: string): Promise<GameSummary | null> {
  const raw = await espnFresh(summaryUrl(sport, eventId));
  if (!raw) return null;
  return parseGameSummary(raw, {
    teamId: SPORT_SPECS[sport].teamId,
    eventDate,
    sport,
  });
}

const summaryCold = unstable_cache(
  loadSummary,
  ['byu-summary-cold-v1'],
  { revalidate: COLD_REVALIDATE_SECONDS, tags: ['byu-scores'] },
);

const summaryHot = unstable_cache(
  loadSummary,
  ['byu-summary-hot-v1'],
  { revalidate: HOT_REVALIDATE_SECONDS, tags: ['byu-scores'] },
);

export function sportBlock(payload: ByuScoresPayload, sport: SportKey): SportScores | null {
  if (sport === 'football') return payload.football;
  if (sport === 'mens-basketball') return payload.basketball;
  if (sport === 'womens-basketball') return payload.womensBasketball;
  return payload.soccer;
}

export function isHotGame(game: ScoreGame, now: number): boolean {
  if (game.state === 'in') return true;
  if (game.state !== 'pre') return false;
  const start = Date.parse(game.start);
  if (!Number.isFinite(start)) return false;
  const delta = start - now;
  return delta <= HOT_WINDOW_MS && delta >= -30 * 60 * 1000;
}

export type GamePageData = {
  sport: SportScores;
  game: ScoreGame;
  summary: GameSummary | null;
};

async function loadGamePage(sport: SportKey, eventId: string, now = Date.now()): Promise<GamePageData | null> {
  const payload = await getByuScores(now);
  const block = payload ? sportBlock(payload, sport) : null;
  const scheduled = block?.games.find((game) => game.id === eventId) ?? null;
  if (!block || !scheduled) return null;

  const summary = await (isHotGame(scheduled, now) ? summaryHot : summaryCold)(
    sport,
    eventId,
    scheduled.start,
  );
  return {
    sport: block,
    game: mergeScheduleGame(scheduled, summary?.game ?? null),
    summary,
  };
}

export const getGamePage = cache(loadGamePage);

const standingsCold = unstable_cache(
  async (sport: SportKey) => {
    const raw = await espnFresh(standingsUrl(sport));
    if (!raw) return null;
    return parseConferenceStandings(raw, SPORT_SPECS[sport].teamId);
  },
  ['byu-standings-v1'],
  { revalidate: COLD_REVALIDATE_SECONDS, tags: ['byu-scores'] },
);

export async function getStandings(sport: SportKey): Promise<ConferenceTable | null> {
  try {
    return await standingsCold(sport);
  } catch (error) {
    console.error('[byu-scores] standings', sport, error instanceof Error ? error.message : 'error');
    return null;
  }
}

export type SeasonSnapshot = {
  averages: AverageStat[];
  leaders: SeasonLeader[];
};

async function buildSeason(sport: SportKey, year: number): Promise<SeasonSnapshot> {
  const [stats, leadersDoc] = await Promise.all([
    espnFresh(statisticsUrl(sport)),
    espnFresh(leadersUrl(sport, year)),
  ]);
  const names: Record<string, string> = {};
  if (leadersDoc) {
    const refs = leaderAthleteRefs(leadersDoc);
    const resolved = await mapPool(refs, 4, async (item) => {
      const body = await espnFresh(item.ref);
      return { id: item.id, name: body ? athleteDisplayName(body) : null };
    });
    for (const item of resolved) {
      if (item.name) names[item.id] = item.name;
    }
  }
  return {
    averages: stats ? parseTeamAverages(stats) : [],
    leaders: leadersDoc ? parseSeasonLeaders(leadersDoc, names) : [],
  };
}

const seasonCold = unstable_cache(
  async (sport: SportKey, year: number) => buildSeason(sport, year),
  ['byu-season-v1'],
  { revalidate: COLD_REVALIDATE_SECONDS, tags: ['byu-scores'] },
);

export async function getSeasonSnapshot(sport: SportKey, year: number | null): Promise<SeasonSnapshot> {
  if (!year) return { averages: [], leaders: [] };
  try {
    return await seasonCold(sport, year);
  } catch (error) {
    console.error('[byu-scores] season', sport, error instanceof Error ? error.message : 'error');
    return { averages: [], leaders: [] };
  }
}

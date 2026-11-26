import type { ByuScoresPayload, ScoreGame, SportKey, SportScores } from './types';

export type StoryRef = {
  id: string;
  title: string;
  publishedAt: string | null;
  /** Editor-selected ESPN event. When set, it wins over title and date matching. */
  espnEventId?: string | null;
};

export function chosenEventId(story: StoryRef): string | null {
  const id = story.espnEventId?.trim();
  return id ? id : null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const REJECT_NEXT = new Set(['state', 'st', 'st.', 'tech', 'valley', 'a&m']);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when the title names this opponent and not a longer school (Utah State, Utah Tech). */
export function mentionsOpponent(title: string, opponent: string): boolean {
  const name = opponent.trim();
  if (name.length < 3) return false;
  const match = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').exec(title);
  if (!match) return false;
  const after = title.slice(match.index + match[0].length).trim();
  const next = after.split(/\s+/)[0]?.replace(/[^a-z.&]/gi, '').toLowerCase() ?? '';
  if (next && REJECT_NEXT.has(next)) return false;
  return true;
}

export function titleMentionsSport(title: string, sport: SportKey): boolean {
  const hay = title.toLowerCase();
  if (sport === 'football') return hay.includes('football');
  if (sport === 'womens-soccer') return hay.includes('soccer');
  if (sport === 'mens-basketball') return /men['’]?s basketball|mens basketball|men['’]?s hoops/.test(hay);
  return /women['’]?s basketball|womens basketball|women['’]?s hoops/.test(hay);
}

export function storyFitsSport(title: string, sport: SportKey, opponents: string[]): boolean {
  const own = titleMentionsSport(title, sport);
  const other = (['football', 'mens-basketball', 'womens-basketball', 'womens-soccer'] as const).some(
    (key) => key !== sport && titleMentionsSport(title, key),
  );
  if (other && !own) return false;
  if (own) return true;
  return opponents.some((opponent) => mentionsOpponent(title, opponent));
}

function daysApart(story: StoryRef, game: ScoreGame): number | null {
  if (!story.publishedAt) return null;
  const published = Date.parse(story.publishedAt);
  const start = Date.parse(game.start);
  if (!Number.isFinite(published) || !Number.isFinite(start)) return null;
  return Math.abs(published - start) / DAY_MS;
}

/** Editor selection wins. Otherwise the opponent must be in the title, within 16 days when dated. */
export function storyMatchesGame(story: StoryRef, game: ScoreGame): boolean {
  const chosen = chosenEventId(story);
  if (chosen) return chosen === game.id;
  if (!mentionsOpponent(story.title, game.opponent)) return false;
  const days = daysApart(story, game);
  return days == null || days <= 16;
}

export function storiesForGame<T extends StoryRef>(game: ScoreGame, stories: T[]): T[] {
  return stories
    .filter((story) => storyMatchesGame(story, game))
    .sort((a, b) => {
      const aDays = daysApart(a, game) ?? 99;
      const bDays = daysApart(b, game) ?? 99;
      return aDays - bDays;
    })
    .slice(0, 4);
}

export type ListedGame = { sport: SportKey; game: ScoreGame };

export function listGames(payload: ByuScoresPayload): ListedGame[] {
  const blocks: Array<SportScores | null> = [
    payload.football,
    payload.basketball,
    payload.womensBasketball,
    payload.soccer,
  ];
  const games: ListedGame[] = [];
  for (const block of blocks) {
    if (!block) continue;
    for (const game of block.games ?? []) games.push({ sport: block.key, game });
  }
  return games;
}

/**
 * Editor-selected event id wins, including when the title names a different opponent.
 * Automatic matching runs only when the editor left the game unset.
 */
export function findGameForStory(story: StoryRef, games: ListedGame[]): ListedGame | null {
  const chosen = chosenEventId(story);
  if (chosen) return games.find((item) => item.game.id === chosen) ?? null;
  const hits = games.filter((item) => storyMatchesGame(story, item.game));
  if (hits.length === 0) return null;
  const sportHits = hits.filter((item) => titleMentionsSport(story.title, item.sport));
  const pool = sportHits.length > 0 ? sportHits : hits;
  return pool.slice().sort((a, b) => {
    const aDays = daysApart(story, a.game) ?? 99;
    const bDays = daysApart(story, b.game) ?? 99;
    if (aDays !== bDays) return aDays - bDays;
    return Date.parse(b.game.start) - Date.parse(a.game.start);
  })[0] ?? null;
}

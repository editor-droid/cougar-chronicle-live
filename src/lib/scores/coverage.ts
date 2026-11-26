import { formatPlace, formatSeoDate } from './format';
import { SPORT_SPECS } from './paths';
import { storyMatchesGame, type ListedGame, type StoryRef } from './stories';
import type { ScoreGame, SportKey } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const PREVIEW_SLACK_MS = 2 * 60 * 60 * 1000;

export type EditorGameOption = { id: string; label: string };

export type CoverageStory = StoryRef & {
  state: 'PUBLISHED' | 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
};

export type GameCoverage = {
  sport: SportKey;
  game: ScoreGame;
  sportLabel: string;
  missingPreview: boolean;
  missingRecap: boolean;
  draftId: string | null;
};

export function editorGameOptions(games: ListedGame[], now: number): EditorGameOption[] {
  const recent = 14 * DAY_MS;
  const picked: ListedGame[] = [];
  for (const item of games) {
    const start = Date.parse(item.game.start);
    if (!Number.isFinite(start)) continue;
    if (item.game.state === 'in' || item.game.state === 'pre') picked.push(item);
    else if (item.game.state === 'post' && now - start <= recent && now >= start) picked.push(item);
  }
  picked.sort((a, b) => {
    const rank = (item: ListedGame) => (item.game.state === 'in' ? 0 : item.game.state === 'pre' ? 1 : 2);
    const tier = rank(a) - rank(b);
    if (tier !== 0) return tier;
    return Date.parse(a.game.start) - Date.parse(b.game.start);
  });
  const seen = new Set<string>();
  const options: EditorGameOption[] = [];
  for (const item of picked) {
    if (seen.has(item.game.id)) continue;
    seen.add(item.game.id);
    const when = item.game.state === 'post' ? 'Final' : item.game.state === 'in' ? 'Live' : 'Upcoming';
    options.push({
      id: item.game.id,
      label: `${SPORT_SPECS[item.sport].label}: ${formatPlace(item.game)} · ${formatSeoDate(item.game.start)} · ${when}`,
    });
    if (options.length >= 24) break;
  }
  return options;
}

function publishedBeforeTip(story: CoverageStory, start: number): boolean {
  if (story.state !== 'PUBLISHED' || !story.publishedAt) return false;
  const published = Date.parse(story.publishedAt);
  return Number.isFinite(published) && published <= start + PREVIEW_SLACK_MS;
}

function publishedAfterStart(story: CoverageStory, start: number): boolean {
  if (story.state !== 'PUBLISHED' || !story.publishedAt) return false;
  const published = Date.parse(story.publishedAt);
  return Number.isFinite(published) && published >= start - PREVIEW_SLACK_MS;
}

export function coverageForGames(games: ListedGame[], stories: CoverageStory[], now: number): GameCoverage[] {
  const rows: GameCoverage[] = [];
  for (const item of games) {
    const start = Date.parse(item.game.start);
    if (!Number.isFinite(start)) continue;
    const age = now - start;
    const upcoming = item.game.state !== 'post' && start - now <= 21 * DAY_MS && now - start <= DAY_MS;
    const recentFinal = item.game.state === 'post' && age >= 0 && age <= 7 * DAY_MS;
    if (!upcoming && !recentFinal && item.game.state !== 'in') continue;
    const linked = stories.filter((story) => storyMatchesGame(story, item.game));
    const draft = linked.find((story) => story.state !== 'PUBLISHED');
    rows.push({
      sport: item.sport,
      game: item.game,
      sportLabel: SPORT_SPECS[item.sport].label,
      missingPreview: !linked.some((story) => publishedBeforeTip(story, start)),
      missingRecap: item.game.state === 'post' && !linked.some((story) => publishedAfterStart(story, start)),
      draftId: draft?.id ?? null,
    });
  }
  return rows;
}

/** Live game for the homepage strip. Null when nothing is in progress. */
export function pickLiveGame(games: ListedGame[]): ListedGame | null {
  return games.find((item) => item.game.state === 'in') ?? null;
}

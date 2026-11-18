export type SportKey = 'football' | 'mens-basketball' | 'womens-basketball' | 'womens-soccer';

export type GameState = 'pre' | 'in' | 'post';

/** One BYU game, normalized from ESPN. Scores are display strings ("63"). */
export type ScoreGame = {
  id: string;
  start: string;
  state: GameState;
  statusText: string;
  clock: string | null;
  period: number | null;
  homeAway: 'home' | 'away';
  neutral: boolean;
  opponent: string;
  opponentAbbrev: string;
  opponentRank: number | null;
  byuScore: string | null;
  opponentScore: string | null;
  byuWinner: boolean | null;
  byuRank: number | null;
  tv: string | null;
  venue: string | null;
  statBroadcastUrl: string | null;
};

export type SportScores = {
  key: SportKey;
  label: string;
  record: string | null;
  standing: string | null;
  rank: number | null;
  live: ScoreGame | null;
  last: ScoreGame | null;
  next: ScoreGame | null;
  /** Games after `next`, capped. Shown in the expanded schedule. */
  upcoming: ScoreGame[];
  scheduleUrl: string;
  /** Present only when a StatBroadcast URL was on the live event. */
  liveStatsUrl: string | null;
};

export type ByuScoresPayload = {
  updatedAt: string;
  stale: boolean;
  revalidateSeconds: number;
  football: SportScores | null;
  basketball: SportScores | null;
  womensBasketball: SportScores | null;
  soccer: SportScores | null;
};

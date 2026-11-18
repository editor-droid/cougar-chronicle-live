export const BYU_TEAM_ID = '252';

/**
 * NCAA women's soccer. Team 252 on `soccer/usa.ncaa.w.1` is Arbroath, not BYU.
 * Confirmed from the league teams list: BYU Cougars is 20516.
 */
export const BYU_WSOC_TEAM_ID = '20516';

/** Refresh while a BYU game is live or starts within 4 hours. */
export const HOT_REVALIDATE_SECONDS = 45;

/** Refresh the rest of the time. */
export const COLD_REVALIDATE_SECONDS = 20 * 60;

export const HOT_WINDOW_MS = 4 * 60 * 60 * 1000;

export const SCHEDULE_URL = {
  football: 'https://byucougars.com/sports/football/schedule',
  'mens-basketball': 'https://byucougars.com/sports/mens-basketball/schedule',
  'womens-basketball': 'https://byucougars.com/sports/womens-basketball/schedule',
  'womens-soccer': 'https://byucougars.com/sports/womens-soccer/schedule',
} as const;

export const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports';
export const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports';

export const FOOTBALL_PATH = 'football/college-football';
export const BASKETBALL_PATH = 'basketball/mens-college-basketball';
export const WOMENS_BASKETBALL_PATH = 'basketball/womens-college-basketball';
export const WOMENS_SOCCER_PATH = 'soccer/usa.ncaa.w.1';

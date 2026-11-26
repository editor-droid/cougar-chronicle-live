import {
  BASKETBALL_PATH,
  BYU_TEAM_ID,
  BYU_WSOC_TEAM_ID,
  ESPN_CORE,
  ESPN_SITE,
  FOOTBALL_PATH,
  WOMENS_BASKETBALL_PATH,
  WOMENS_SOCCER_PATH,
} from './constants';
import type { SportKey } from './types';

export type SportSpec = {
  key: SportKey;
  label: string;
  path: string;
  teamId: string;
  /** Core API league path, without the sports host. */
  coreLeague: string;
};

export const SPORT_SPECS: Record<SportKey, SportSpec> = {
  football: {
    key: 'football',
    label: 'Football',
    path: FOOTBALL_PATH,
    teamId: BYU_TEAM_ID,
    coreLeague: 'football/leagues/college-football',
  },
  'mens-basketball': {
    key: 'mens-basketball',
    label: "Men's Basketball",
    path: BASKETBALL_PATH,
    teamId: BYU_TEAM_ID,
    coreLeague: 'basketball/leagues/mens-college-basketball',
  },
  'womens-basketball': {
    key: 'womens-basketball',
    label: "Women's Basketball",
    path: WOMENS_BASKETBALL_PATH,
    teamId: BYU_TEAM_ID,
    coreLeague: 'basketball/leagues/womens-college-basketball',
  },
  'womens-soccer': {
    key: 'womens-soccer',
    label: "Women's Soccer",
    path: WOMENS_SOCCER_PATH,
    teamId: BYU_WSOC_TEAM_ID,
    coreLeague: 'soccer/leagues/usa.ncaa.w.1',
  },
};

const SPORT_KEYS = Object.keys(SPORT_SPECS) as SportKey[];

export function isSportKey(value: string): value is SportKey {
  return SPORT_KEYS.includes(value as SportKey);
}

export function teamHref(sport: SportKey): string {
  return `/sports/${sport}`;
}

export function gameHref(sport: SportKey, eventId: string): string {
  return `/sports/${sport}/${eventId}`;
}

export function summaryUrl(sport: SportKey, eventId: string): string {
  return `${ESPN_SITE}/${SPORT_SPECS[sport].path}/summary?event=${encodeURIComponent(eventId)}`;
}

export function standingsUrl(sport: SportKey): string {
  return `https://site.api.espn.com/apis/v2/sports/${SPORT_SPECS[sport].path}/standings`;
}

export function statisticsUrl(sport: SportKey): string {
  const spec = SPORT_SPECS[sport];
  return `${ESPN_SITE}/${spec.path}/teams/${spec.teamId}/statistics`;
}

export function leadersUrl(sport: SportKey, seasonYear: number): string {
  const spec = SPORT_SPECS[sport];
  return `${ESPN_CORE}/${spec.coreLeague}/seasons/${seasonYear}/types/2/teams/${spec.teamId}/leaders`;
}

import { formatDenver, formatSeoDate } from './format';
import type { ScoreGame } from './types';

export function siteOrigin(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://thecougarchronicle.com'
  ).replace(/\/$/, '');
}

export function matchupPhrase(game: ScoreGame): string {
  const place = game.neutral || game.homeAway === 'home' ? 'vs' : 'at';
  return `BYU ${place} ${game.opponent}`;
}

/** Document title without the site name. The root template appends " | The Cougar Chronicle". */
export function gameSeoTitle(game: ScoreGame): string {
  return `${matchupPhrase(game)} Score & Box Score, ${formatSeoDate(game.start)}`;
}

export function gameSeoDescription(game: ScoreGame): string {
  const when = formatSeoDate(game.start);
  const score = game.state === 'post' && game.byuScore && game.opponentScore
    ? ` Final: BYU ${game.byuScore}–${game.opponentScore}.`
    : '';
  return `${matchupPhrase(game)} on ${when}.${score} Score, box score, and stats from The Cougar Chronicle, an independent student paper.`.replace(
    /\s+/g,
    ' ',
  ).trim();
}

export function teamSeoTitle(label: string): string {
  return `BYU ${label} Schedule, Scores & Standings`;
}

export function teamSeoDescription(label: string): string {
  return `BYU ${label.toLowerCase()} schedule, results, conference standings, and season stats. Independent coverage from The Cougar Chronicle.`;
}

export function buildPregameBlurb(
  game: ScoreGame,
  byuRecord: string | null,
  opponentRecord: string | null,
): string | null {
  if (game.state !== 'pre') return null;
  const when = formatDenver(game.start);
  const place = game.neutral || game.homeAway === 'home' ? 'vs' : 'at';
  const byu = byuRecord ? `BYU (${byuRecord})` : 'BYU';
  const opponent = opponentRecord ? `${game.opponent} (${opponentRecord})` : game.opponent;
  const parts = [`${byu} plays ${place} ${opponent}`];
  if (when.date !== 'TBD') parts[0] += ` on ${when.date}`;
  if (when.time) parts.push(when.time);
  if (game.venue) parts.push(game.venue);
  if (game.tv) parts.push(`TV: ${game.tv}`);
  return parts.join(' · ');
}

export function gameJsonLd(input: {
  game: ScoreGame;
  url: string;
  byuRecord: string | null;
  opponentRecord: string | null;
}): Record<string, unknown> {
  const { game, url } = input;
  const homeIsByu = game.homeAway === 'home' && !game.neutral;
  const byu: Record<string, unknown> = { '@type': 'SportsTeam', name: 'BYU' };
  const opponent: Record<string, unknown> = { '@type': 'SportsTeam', name: game.opponent };
  const home = homeIsByu ? byu : opponent;
  const away = homeIsByu ? opponent : byu;
  const description = gameSeoDescription(game);
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: matchupPhrase(game),
    description,
    startDate: game.start,
    url,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    homeTeam: home,
    awayTeam: away,
    competitor: [byu, opponent],
    organizer: {
      '@type': 'Organization',
      name: 'The Cougar Chronicle',
      url: 'https://thecougarchronicle.com',
    },
  };
  if (game.venue) {
    data.location = { '@type': 'Place', name: game.venue };
  }
  return data;
}

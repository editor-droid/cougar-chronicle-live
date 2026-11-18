import type { ScoreGame, SportKey } from './types';

const DENVER = 'America/Denver';

export function formatDenver(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: 'TBD', time: '' };

  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).formatToParts(d);
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).formatToParts(d);

  const pick = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const date = `${pick(dateParts, 'weekday')}, ${pick(dateParts, 'month')} ${pick(dateParts, 'day')}`;
  const time = `${pick(timeParts, 'hour')}:${pick(timeParts, 'minute')} ${pick(timeParts, 'dayPeriod')} ${pick(timeParts, 'timeZoneName')}`.replace(
    /\s+/g,
    ' '
  ).trim();
  return { date, time };
}

export function denverYmd(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return null;
  return `${year}${month}${day}`;
}

/** College football season year is the fall. January bowls still belong to that fall. */
export function footballSeasonYear(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return now.getUTCFullYear();
  return month <= 2 ? year - 1 : year;
}

export function periodLabel(period: number | null, sport: SportKey): string | null {
  if (!period || period < 1) return null;
  if (sport === 'football') {
    if (period <= 4) return (['1st', '2nd', '3rd', '4th'] as const)[period - 1];
    return period === 5 ? 'OT' : `${period - 4}OT`;
  }
  if (sport === 'womens-soccer') {
    if (period === 1) return '1st';
    if (period === 2) return '2nd';
    if (period === 3) return 'ET';
    return 'PK';
  }
  if (period === 1) return '1st';
  if (period === 2) return '2nd';
  return period === 3 ? 'OT' : `${period - 2}OT`;
}

export function formatLiveStatus(game: ScoreGame, sport: SportKey): string {
  if (game.statusText && /\d/.test(game.statusText)) return game.statusText;
  const label = periodLabel(game.period, sport);
  const bits = [game.clock, label].filter(Boolean);
  return bits.join(' · ') || 'Live';
}

export function formatResult(game: ScoreGame): string {
  const mark = game.byuWinner === true ? 'W' : game.byuWinner === false ? 'L' : '';
  if (game.byuScore && game.opponentScore) {
    return `${mark ? `${mark} ` : ''}${game.byuScore}–${game.opponentScore}`;
  }
  return mark || game.statusText || 'Final';
}

export function formatPlace(game: ScoreGame): string {
  const rank = game.opponentRank ? `#${game.opponentRank} ` : '';
  const name = `${rank}${game.opponent}`;
  if (game.neutral || game.homeAway === 'home') return `vs ${name}`;
  return `at ${name}`;
}

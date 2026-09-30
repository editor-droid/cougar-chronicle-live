/** Reminder rules for the drafts desk. Dates are America/Denver calendar days (YYYY-MM-DD).
 *
 * Published stories produce no reminders.
 * due         — target is today or tomorrow
 * overdue     — target has passed
 * unstarted   — draft body is still essentially empty, target is within 2 days, and the writer was not assigned today
 * unsubmitted — still a draft on the due day, the day before, or after the date has passed
 * unscheduled — approved, with no publish time, on the due day, the day before, or after the date has passed
 *
 * Each one is sent once per target date, to each assigned person.
 */

export const DESK_EMPTY_BODY = 40;

export type DeskState = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED';

export type DeskReminderReason = 'due' | 'overdue' | 'unstarted' | 'unsubmitted' | 'unscheduled';

export type DeskStorySnapshot = {
  state: DeskState;
  /** Visible text length of the draft body. */
  textLength: number;
  /** Target day, YYYY-MM-DD. */
  targetDate: string | null;
  /** True when a future publish time is set. */
  scheduled: boolean;
  /** True when any publish time is set, including one the publish job has not run yet. */
  hasPublishTime: boolean;
  /** Denver day the current writer was assigned. Null if unknown. */
  assignedOn: string | null;
  notices: string[];
};

export type DeskReminderPlan = {
  reasons: DeskReminderReason[];
  keys: string[];
};

export function denverToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(now);
}

export function daysUntilTarget(targetDate: string, today: string): number {
  const target = Date.parse(`${targetDate}T12:00:00Z`);
  const current = Date.parse(`${today}T12:00:00Z`);
  return Math.round((target - current) / 86_400_000);
}

export function plainTextLength(html: string | null | undefined): number {
  if (!html) return 0;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length;
}

const LEGACY_NOTICE = /^(due|overdue|unstarted|unsubmitted|unscheduled):\d{4}-\d{2}-\d{2}$/;

/** Notice keys this person has already received. Older unsuffixed keys count only for the writer. */
export function noticesForRecipient(
  notices: string[],
  userId: string,
  includeLegacy: boolean
): string[] {
  const seen: string[] = [];
  const suffix = `:${userId}`;
  for (const notice of notices) {
    if (notice.endsWith(suffix)) seen.push(notice.slice(0, -suffix.length));
    else if (includeLegacy && LEGACY_NOTICE.test(notice)) seen.push(notice);
  }
  return seen;
}

export function parseDeskNotices(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function planDeskReminders(story: DeskStorySnapshot, today: string): DeskReminderPlan {
  if (!story.targetDate || story.state === 'PUBLISHED') return { reasons: [], keys: [] };

  const days = daysUntilTarget(story.targetDate, today);
  const date = story.targetDate;
  const has = (key: string) => story.notices.includes(key);
  const reasons: DeskReminderReason[] = [];
  const keys: string[] = [];

  const add = (reason: DeskReminderReason, key: string) => {
    if (has(key)) return;
    reasons.push(reason);
    keys.push(key);
  };

  if (days === 0 || days === 1) add('due', `due:${date}`);
  if (days < 0) add('overdue', `overdue:${date}`);

  const assignedToday = story.assignedOn === today;
  if (
    story.state === 'DRAFT' &&
    story.textLength < DESK_EMPTY_BODY &&
    days <= 2 &&
    !assignedToday
  ) {
    add('unstarted', `unstarted:${date}`);
  }

  if (story.state === 'DRAFT' && days <= 1) add('unsubmitted', `unsubmitted:${date}`);

  if (story.state === 'APPROVED' && !story.hasPublishTime && days <= 1) {
    add('unscheduled', `unscheduled:${date}`);
  }

  return { reasons, keys };
}

export function deskReminderSubject(title: string, reasons: DeskReminderReason[]): string {
  if (reasons.includes('overdue')) return `Overdue: ${title}`;
  if (reasons.includes('due')) return `Due soon: ${title}`;
  if (reasons.includes('unsubmitted')) return `Still a draft: ${title}`;
  if (reasons.includes('unstarted')) return `Not started: ${title}`;
  return `Needs a publish time: ${title}`;
}

export function formatDeskDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

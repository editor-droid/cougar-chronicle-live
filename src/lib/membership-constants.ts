/** Named “supporter” gift on /fundraiser (recognition only — no membership unlock). */
export const AUGUST_SUPPORTER_MIN = 25;

/** Min gift on /fundraiser in August for full membership perks (1 year). */
export const AUGUST_MEMBERSHIP_MIN = 48;

/** Calendar August (any year) — campaign window for fundraiser membership perk. Safe for client. */
export function isAugustFundraiserWindow(date = new Date()): boolean {
  return date.getMonth() === 7; // 0-indexed: August = 7
}

/**
 * Autosave timing. Typing only updates this clock; it does not render.
 * A save is due 3s after the last edit, and at least every 30s while editing.
 */

export const AUTOSAVE_DEBOUNCE_MS = 3000;
export const AUTOSAVE_MAX_WAIT_MS = 30000;

export type AutosaveClock = {
  /** Timestamp of the first unsaved edit in this burst. */
  dirtySince: number | null;
  /** Timestamp when the post-typing debounce elapses. */
  debounceAt: number | null;
};

export function idleClock(): AutosaveClock {
  return { dirtySince: null, debounceAt: null };
}

export function noteEdit(clock: AutosaveClock, now: number): AutosaveClock {
  return {
    dirtySince: clock.dirtySince ?? now,
    debounceAt: now + AUTOSAVE_DEBOUNCE_MS,
  };
}

export function autosaveFireAt(clock: AutosaveClock): number | null {
  if (clock.dirtySince == null || clock.debounceAt == null) return null;
  return Math.min(clock.debounceAt, clock.dirtySince + AUTOSAVE_MAX_WAIT_MS);
}

export function autosaveDue(clock: AutosaveClock, now: number): boolean {
  const at = autosaveFireAt(clock);
  return at != null && now >= at;
}

/** Quiet header label, e.g. "Saved · 12:03". */
export function formatSavedLabel(kind: 'Saved' | 'Saved locally', at: Date): string {
  const hour12 = at.getHours() % 12 || 12;
  const minute = String(at.getMinutes()).padStart(2, '0');
  return `${kind} · ${hour12}:${minute}`;
}

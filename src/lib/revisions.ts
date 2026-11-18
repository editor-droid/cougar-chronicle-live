/**
 * Revision policy. Pure so pruning and the published-post guard are testable
 * without a database.
 */

export const MAX_REVISIONS_PER_POST = 50;
export const AUTOSAVE_REVISION_GAP_MS = 10 * 60 * 1000;

export type RevisionStamp = { id: string; createdAt: number };

/**
 * Ids to delete so only the newest `max` snapshots remain.
 * Newest first. Equal timestamps break ties by id so the result is stable.
 */
export function revisionIdsToPrune(revisions: RevisionStamp[], max = MAX_REVISIONS_PER_POST): string[] {
  if (max < 1) return revisions.map((revision) => revision.id);
  const sorted = [...revisions].sort((a, b) => {
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  return sorted.slice(max).map((revision) => revision.id);
}

/** Autosave snapshots are throttled. Manual saves and status changes are not. */
export function shouldKeepAutosaveRevision(
  lastAutosaveAt: number | null,
  now: number,
  gap = AUTOSAVE_REVISION_GAP_MS
): boolean {
  if (lastAutosaveAt == null) return true;
  return now - lastAutosaveAt >= gap;
}

/**
 * Autosave may write the live post row only when that row is not what
 * readers are being served. Published stories stay put until a manual save.
 */
export function autosaveWritesLivePost(state: string | null | undefined): boolean {
  return state != null && state !== 'PUBLISHED';
}

export type AutosavePlan = 'manual' | 'local-only' | 'live-post' | 'revision-only';

export function planAutosave(input: {
  autosave: boolean;
  hasId: boolean;
  state: string | null | undefined;
}): AutosavePlan {
  if (!input.autosave) return 'manual';
  if (!input.hasId) return 'local-only';
  if (!autosaveWritesLivePost(input.state)) return 'revision-only';
  return 'live-post';
}

/**
 * Staff roles: USER (reader) | WRITER | EDITOR | ADMIN
 *
 * WRITER  — own drafts; submit for review
 * EDITOR  — edit any post; approve for publish; cannot publish live
 * ADMIN   — full control including publish
 */

export type StaffRole = 'USER' | 'WRITER' | 'EDITOR' | 'ADMIN' | string;

export function isAdmin(role: StaffRole | null | undefined): boolean {
  return role === 'ADMIN';
}

export function isEditor(role: StaffRole | null | undefined): boolean {
  return role === 'EDITOR';
}

/** Edit any post (not limited to own drafts). */
export function canEditAllPosts(role: StaffRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'EDITOR';
}

/** Move IN_REVIEW → APPROVED (ready for an admin to publish). */
export function canApprovePosts(role: StaffRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'EDITOR';
}

/** Publish live / schedule go-live (PUBLISHED state). Admin only. */
export function canPublishPosts(role: StaffRole | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canAccessDashboard(role: StaffRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'EDITOR' || role === 'WRITER';
}

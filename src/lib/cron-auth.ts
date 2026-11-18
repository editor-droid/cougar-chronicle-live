/**
 * Cron routes fail closed.
 * The external trigger must send `Authorization: Bearer ${CRON_SECRET}`.
 * A missing secret is unauthorized — it must not run the job.
 */
export function isCronAuthorized(
  authorization: string | null,
  secret: string | undefined | null
): boolean {
  if (!secret) return false;
  return authorization === `Bearer ${secret}`;
}

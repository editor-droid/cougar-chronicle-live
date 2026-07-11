/**
 * Cloudflare Stream analytics via GraphQL.
 * Requires API token with Account Analytics (or account-level) access.
 * Docs: https://developers.cloudflare.com/stream/getting-analytics/fetching-bulk-analytics/
 */

export type StreamMinutesByUid = Record<
  string,
  { minutes7d: number; minutes30d: number }
>;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeDays(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  // API: date_lt is exclusive; use tomorrow so "today" is included
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { start: ymd(start), end: ymd(endExclusive) };
}

async function fetchMinutesViewedMap(
  accountId: string,
  apiToken: string,
  start: string,
  end: string
): Promise<Record<string, number>> {
  const query = `
    query StreamMinutes($accountTag: string!, $start: Date, $end: Date) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          streamMinutesViewedAdaptiveGroups(
            filter: { date_geq: $start, date_lt: $end }
            orderBy: [sum_minutesViewed_DESC]
            limit: 10000
          ) {
            sum {
              minutesViewed
            }
            dimensions {
              uid
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { accountTag: accountId, start, end },
    }),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Stream analytics HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e: { message?: string }) => e.message).join('; ');
    throw new Error(msg || 'GraphQL analytics error');
  }

  const groups =
    json?.data?.viewer?.accounts?.[0]?.streamMinutesViewedAdaptiveGroups || [];
  const map: Record<string, number> = {};
  for (const row of groups) {
    const uid = row?.dimensions?.uid;
    const mins = Number(row?.sum?.minutesViewed) || 0;
    if (!uid) continue;
    map[uid] = (map[uid] || 0) + mins;
  }
  return map;
}

/**
 * Minutes of video delivered per Stream UID for last 7 and 30 days.
 * Returns empty map + error string if token lacks analytics permission.
 */
export async function fetchStreamMinutesByUid(): Promise<{
  byUid: StreamMinutesByUid;
  error: string | null;
}> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return { byUid: {}, error: 'Stream API not configured' };
  }

  try {
    const r7 = rangeDays(7);
    const r30 = rangeDays(30);
    const [m7, m30] = await Promise.all([
      fetchMinutesViewedMap(accountId, apiToken, r7.start, r7.end),
      fetchMinutesViewedMap(accountId, apiToken, r30.start, r30.end),
    ]);

    const uids = new Set([...Object.keys(m7), ...Object.keys(m30)]);
    const byUid: StreamMinutesByUid = {};
    for (const uid of uids) {
      byUid[uid] = {
        minutes7d: Math.round((m7[uid] || 0) * 10) / 10,
        minutes30d: Math.round((m30[uid] || 0) * 10) / 10,
      };
    }
    return { byUid, error: null };
  } catch (e) {
    console.error('fetchStreamMinutesByUid', e);
    const message = (e as Error).message || 'Failed to load Stream analytics';
    // Common: token missing Account Analytics permission
    if (/auth|permission|forbidden|unauthorized/i.test(message)) {
      return {
        byUid: {},
        error:
          'Stream analytics needs an API token with Account Analytics access (in addition to Stream:Edit).',
      };
    }
    return { byUid: {}, error: message };
  }
}

/** Pull latest duration/dimensions from Stream for UIDs missing meta. */
export async function refreshStreamMetaForVideos(
  videos: { id: string; platform: string; externalId: string; durationSec: number | null; width: number | null; height: number | null }[]
): Promise<void> {
  const { fetchStreamDetails } = await import('@/lib/videos');
  const prisma = (await import('@/lib/prisma')).default;

  const needs = videos.filter(
    (v) =>
      v.platform === 'STREAM' &&
      v.externalId &&
      (v.durationSec == null || v.width == null || v.height == null)
  );
  // Cap concurrent refreshes
  for (const v of needs.slice(0, 12)) {
    try {
      const meta = await fetchStreamDetails(v.externalId);
      if (!meta) continue;
      await prisma.video.update({
        where: { id: v.id },
        data: {
          ...(meta.durationSec != null && v.durationSec == null
            ? { durationSec: meta.durationSec }
            : {}),
          ...(meta.width != null && v.width == null ? { width: meta.width } : {}),
          ...(meta.height != null && v.height == null ? { height: meta.height } : {}),
          ...(meta.thumbnailUrl ? { thumbnailUrl: meta.thumbnailUrl } : {}),
        },
      });
    } catch (e) {
      console.error('refreshStreamMeta', v.externalId, e);
    }
  }
}

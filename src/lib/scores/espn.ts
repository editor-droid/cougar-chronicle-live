import { HOT_REVALIDATE_SECONDS } from './constants';

const ESPN_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  Origin: 'https://www.espn.com',
  Referer: 'https://www.espn.com/',
} as const;

export type FetchCtx = { stale: boolean };

const lastGood = new Map<string, unknown>();

export function toHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * Server-side ESPN fetch. A bare request 403s, so every call sends a browser
 * User-Agent plus Origin/Referer. The last good body for each URL stays in
 * memory and is returned with `ctx.stale` if ESPN fails.
 */
export async function espnJson(url: string, ctx: FetchCtx): Promise<unknown> {
  const href = toHttps(url);
  try {
    const response = await fetch(href, {
      headers: ESPN_HEADERS,
      signal: AbortSignal.timeout(8000),
      next: { revalidate: HOT_REVALIDATE_SECONDS, tags: ['byu-scores'] },
    });
    if (!response.ok) throw new Error(`ESPN ${response.status}`);
    const body: unknown = await response.json();
    lastGood.set(href, body);
    return body;
  } catch (error) {
    const cached = lastGood.get(href);
    if (cached !== undefined) {
      ctx.stale = true;
      return cached;
    }
    const message = error instanceof Error ? error.message : 'request failed';
    throw new Error(`ESPN fetch failed (${message})`);
  }
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

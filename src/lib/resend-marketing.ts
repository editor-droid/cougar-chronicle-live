import { Resend } from 'resend';
import { marketingApiKey, NEWSLETTER_FROM } from './email';

type ResendError = { name: string; message: string; statusCode?: number | null };

export type MarketingSendResult =
  | { ok: true; id: string; recipients: number }
  | { ok: false; error: string; restricted?: boolean };

class MarketingAuthError extends Error {
  readonly restricted = true;
}

const segmentIds = new Map<string, string>();

function client(): Resend {
  return new Resend(marketingApiKey() || 're_unconfigured');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRateLimit<T extends { error: ResendError | null }>(fn: () => Promise<T>): Promise<T> {
  let last = await fn();
  for (let attempt = 0; attempt < 4 && last.error?.name === 'rate_limit_exceeded'; attempt++) {
    await sleep(400 * (attempt + 1));
    last = await fn();
  }
  if (last.error?.name === 'restricted_api_key') {
    throw new MarketingAuthError(last.error.message);
  }
  return last;
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  if (items.length === 0) return;
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      await fn(items[index]);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

async function refreshSegmentCache(resend: Resend) {
  let after: string | undefined;
  for (let page = 0; page < 20; page++) {
    const res = await withRateLimit(() =>
      resend.segments.list(after ? { limit: 100, after } : { limit: 100 })
    );
    if (res.error) throw new Error(res.error.message);
    const rows = res.data?.data;
    if (!Array.isArray(rows)) throw new Error('Unexpected segment list response');
    for (const row of rows) segmentIds.set(row.name, row.id);
    if (!res.data?.has_more || rows.length === 0) return;
    after = rows[rows.length - 1]?.id;
    if (!after) return;
  }
}

async function ensureSegmentId(resend: Resend, name: string): Promise<string> {
  const cached = segmentIds.get(name);
  if (cached) return cached;
  await refreshSegmentCache(resend);
  const found = segmentIds.get(name);
  if (found) return found;

  const created = await withRateLimit(() => resend.segments.create({ name }));
  if (created.data?.id) {
    segmentIds.set(name, created.data.id);
    return created.data.id;
  }
  await refreshSegmentCache(resend);
  const again = segmentIds.get(name);
  if (again) return again;
  throw new Error(created.error?.message || `Could not create segment ${name}`);
}

async function listSegmentEmails(resend: Resend, segmentId: string): Promise<Map<string, string>> {
  const current = new Map<string, string>();
  let after: string | undefined;
  for (let page = 0; page < 50; page++) {
    const res = await withRateLimit(() =>
      resend.contacts.list(after ? { segmentId, limit: 100, after } : { segmentId, limit: 100 })
    );
    if (res.error) throw new Error(res.error.message);
    const rows = res.data?.data;
    if (!Array.isArray(rows)) throw new Error('Unexpected contact list response');
    for (const row of rows) {
      if (row.email) current.set(row.email.trim().toLowerCase(), row.email.trim());
    }
    if (!res.data?.has_more || rows.length === 0) break;
    after = rows[rows.length - 1]?.id;
    if (!after) break;
  }
  return current;
}

async function addToSegment(resend: Resend, email: string, segmentId: string): Promise<boolean> {
  const added = await withRateLimit(() => resend.contacts.segments.add({ email, segmentId }));
  if (!added.error) return true;
  if (added.error.name !== 'not_found') {
    console.error('[marketing] segment add failed', email, added.error.message);
    return false;
  }
  const created = await withRateLimit(() =>
    resend.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: segmentId }],
    })
  );
  if (!created.error) return true;
  console.error('[marketing] contact create failed', email, created.error.message);
  return false;
}

/**
 * Resend marketing mail is a Broadcast to a segment, not emails.send.
 * Sync the segment to this recipient list, then send.
 */
export async function sendMarketingBroadcast(opts: {
  segmentName: string;
  emails: string[];
  subject: string;
  html: string;
  name: string;
  previewText?: string;
  idempotencyKey: string;
}): Promise<MarketingSendResult> {
  const desired = new Map<string, string>();
  for (const raw of opts.emails) {
    const email = raw.trim();
    if (!email) continue;
    desired.set(email.toLowerCase(), email);
  }
  if (desired.size === 0) return { ok: true, id: '', recipients: 0 };

  const resend = client();
  try {
    const segmentId = await ensureSegmentId(resend, opts.segmentName);
    const current = await listSegmentEmails(resend, segmentId);

    const remove: string[] = [];
    for (const [key, email] of current) {
      if (!desired.has(key)) remove.push(email);
    }
    const add: string[] = [];
    for (const [key, email] of desired) {
      if (!current.has(key)) add.push(email);
    }

    let removeFailures = 0;
    await mapPool(remove, 4, async (email) => {
      const res = await withRateLimit(() => resend.contacts.segments.remove({ email, segmentId }));
      if (res.error) {
        removeFailures += 1;
        console.error('[marketing] segment remove failed', email, res.error.message);
      }
    });
    if (removeFailures > 0) {
      return {
        ok: false,
        error: `Left ${removeFailures} opted-out addresses in ${opts.segmentName}; broadcast not sent.`,
      };
    }

    let added = 0;
    await mapPool(add, 4, async (email) => {
      if (await addToSegment(resend, email, segmentId)) added += 1;
    });

    const recipients = current.size - remove.length + added;
    if (recipients <= 0) {
      return { ok: false, error: `No contacts in ${opts.segmentName} after sync.` };
    }

    const idempotencyKey = opts.idempotencyKey.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 256);
    const sent = await withRateLimit(() =>
      resend.broadcasts.create(
        {
          segmentId,
          from: NEWSLETTER_FROM,
          subject: opts.subject,
          html: opts.html,
          name: opts.name.slice(0, 120),
          previewText: opts.previewText?.replace(/\s+/g, ' ').trim().slice(0, 140) || undefined,
          send: true,
          ...(process.env.RESEND_TOPIC_ID ? { topicId: process.env.RESEND_TOPIC_ID } : {}),
        },
        idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined
      )
    );
    if (sent.error || !sent.data?.id) {
      return { ok: false, error: sent.error?.message || 'Broadcast create failed' };
    }
    console.log(`[marketing] broadcast ${sent.data.id} segment=${opts.segmentName} recipients≈${recipients}`);
    return { ok: true, id: sent.data.id, recipients };
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      const message =
        'Resend rejected the marketing broadcast because this API key can only send transactional email. Full access is required.';
      console.error('[marketing]', message);
      return { ok: false, error: message, restricted: true };
    }
    const message = error instanceof Error ? error.message : 'Marketing send failed';
    console.error('[marketing]', message);
    return { ok: false, error: message };
  }
}

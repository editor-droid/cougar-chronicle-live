import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { savePushAlerts } from '@/lib/scores/alerts-run';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function POST(req: Request) {
  const { success } = rateLimit(`sports-alert-push:${getClientIp(req)}`, 12, 15 * 60 * 1000);
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: NO_STORE });

  let body: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
    p256dh?: unknown;
    auth?: unknown;
    sports?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await savePushAlerts(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status, headers: NO_STORE });
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[sports-alerts] push signup failed', error instanceof Error ? error.message : '');
    return NextResponse.json({ error: 'Could not save this browser.' }, { status: 500, headers: NO_STORE });
  }
}

import { NextResponse } from 'next/server';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { unsubscribeAlertEmail } from '@/lib/scores/alerts-run';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

async function readToken(req: Request): Promise<string> {
  const fromQuery = new URL(req.url).searchParams.get('token') || '';
  if (fromQuery) return fromQuery;
  try {
    const body = await req.json();
    return typeof body?.token === 'string' ? body.token : '';
  } catch {
    return '';
  }
}

async function unsubscribe(req: Request) {
  const { success } = rateLimit(`sports-alert-unsub:${getClientIp(req)}`, 30, 15 * 60 * 1000);
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: NO_STORE });
  const token = await readToken(req);
  try {
    const result = await unsubscribeAlertEmail(token);
    if (result === 'disabled') {
      return NextResponse.json({ error: 'Email alerts are not available.' }, { status: 503, headers: NO_STORE });
    }
    if (result === 'invalid') {
      return NextResponse.json({ error: 'This unsubscribe link is invalid or expired.' }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[sports-alerts] unsubscribe failed', error instanceof Error ? error.message : '');
    return NextResponse.json({ error: 'Could not unsubscribe.' }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(req: Request) {
  return unsubscribe(req);
}

export async function GET(req: Request) {
  return unsubscribe(req);
}

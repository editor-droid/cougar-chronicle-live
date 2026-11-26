import { NextResponse } from 'next/server';
import { confirmAlertEmail } from '@/lib/scores/alerts-run';

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

export async function POST(req: Request) {
  const token = await readToken(req);
  try {
    const result = await confirmAlertEmail(token);
    if (result === 'disabled') {
      return NextResponse.json({ error: 'Email alerts are not available.' }, { status: 503, headers: NO_STORE });
    }
    if (result === 'invalid') {
      return NextResponse.json({ error: 'This confirmation link is invalid or expired.' }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[sports-alerts] confirm failed', error instanceof Error ? error.message : '');
    return NextResponse.json({ error: 'Could not confirm that signup.' }, { status: 500, headers: NO_STORE });
  }
}

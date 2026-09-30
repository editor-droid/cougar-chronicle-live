import { NextResponse } from 'next/server';
import { runDeskReminders } from '@/lib/desk-reminders';

export const dynamic = 'force-dynamic';

/** Daily drafts-desk reminders. Safe to call more often: each reminder is sent once. */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDeskReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Desk reminder cron failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

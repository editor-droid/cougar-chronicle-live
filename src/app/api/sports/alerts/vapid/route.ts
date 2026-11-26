import { NextResponse } from 'next/server';
import { alertChannels } from '@/lib/scores/alerts-run';

export const dynamic = 'force-dynamic';

export async function GET() {
  const channels = alertChannels();
  return NextResponse.json(channels, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

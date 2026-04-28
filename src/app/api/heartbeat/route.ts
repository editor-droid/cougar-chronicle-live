import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Perform a lightweight query to keep the Supabase free tier active
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', message: 'Heartbeat successful' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Database connection failed' }, { status: 500 });
  }
}

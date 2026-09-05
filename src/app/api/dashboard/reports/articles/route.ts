import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  articlesToCsv,
  listPublishedArticles,
  parseYmd,
} from '@/lib/grant-report';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const from = parseYmd(url.searchParams.get('from'));
  const to = parseYmd(url.searchParams.get('to'));
  if (!from || !to) {
    return NextResponse.json(
      { error: 'Provide from and to as YYYY-MM-DD' },
      { status: 400 }
    );
  }
  if (from > to) {
    return NextResponse.json({ error: 'from must be on or before to' }, { status: 400 });
  }

  const rows = await listPublishedArticles(from, to);
  const csv = `\uFEFF${articlesToCsv(rows)}`;
  const filename = `chronicle-articles-${from}-through-${to}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

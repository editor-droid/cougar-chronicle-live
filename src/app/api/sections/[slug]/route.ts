import { NextResponse } from 'next/server';
import { isSectionSlug } from '@/lib/categories';
import { loadSectionPage } from '@/lib/section-listing';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  if (!isSectionSlug(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const data = await loadSectionPage(slug, {
    page: url.searchParams.get('page'),
    sort: url.searchParams.get('sort'),
  });
  return NextResponse.json(data);
}

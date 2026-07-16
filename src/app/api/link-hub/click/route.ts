import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { linkHubTrackedUrl } from '@/lib/link-hub';

/**
 * Public click-through: increment counter and redirect with UTMs.
 * GET /api/link-hub/click?id=...
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const item = await prisma.linkHubItem.findFirst({
    where: { id, isActive: true },
  });

  if (!item) {
    return NextResponse.redirect(new URL('/links', req.url));
  }

  // Fire-and-forget count (don't block redirect hard)
  prisma.linkHubItem
    .update({
      where: { id: item.id },
      data: { clickCount: { increment: 1 } },
    })
    .catch((e) => console.error('link hub click count', e));

  const dest = linkHubTrackedUrl(item.url, {
    campaign: item.utmCampaign || 'profile',
    content: item.id.slice(0, 12),
  });

  return NextResponse.redirect(dest, 302);
}

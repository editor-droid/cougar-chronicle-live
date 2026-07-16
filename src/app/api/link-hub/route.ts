import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { LINK_HUB_SHOW_LATEST_KEY } from '@/lib/link-hub';

async function requireStaff() {
  const session = await auth();
  if (!session?.user) return null;
  const role = session.user.role;
  if (role !== 'ADMIN' && role !== 'EDITOR') return null;
  return session;
}

/** List all hub items + settings (dashboard). */
export async function GET() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [items, setting] = await Promise.all([
    prisma.linkHubItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    prisma.siteSetting.findUnique({ where: { key: LINK_HUB_SHOW_LATEST_KEY } }),
  ]);

  return NextResponse.json({
    items,
    showLatestStory: setting?.value !== 'false',
  });
}

/** Create item */
export async function POST(req: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const label = String(body.label || '').trim();
  const url = String(body.url || '').trim();
  if (!label || !url) {
    return NextResponse.json({ error: 'Label and URL required' }, { status: 400 });
  }

  const maxOrder = await prisma.linkHubItem.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const item = await prisma.linkHubItem.create({
    data: {
      label,
      url,
      emoji: body.emoji ? String(body.emoji).slice(0, 16) : null,
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      showImage: Boolean(body.showImage),
      isActive: body.isActive !== false,
      sortOrder,
      utmCampaign: body.utmCampaign ? String(body.utmCampaign).slice(0, 80) : null,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}

/** Bulk reorder or toggle latest-story setting */
export async function PATCH(req: Request) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  if (typeof body.showLatestStory === 'boolean') {
    await prisma.siteSetting.upsert({
      where: { key: LINK_HUB_SHOW_LATEST_KEY },
      create: {
        key: LINK_HUB_SHOW_LATEST_KEY,
        value: body.showLatestStory ? 'true' : 'false',
      },
      update: { value: body.showLatestStory ? 'true' : 'false' },
    });
    return NextResponse.json({ success: true, showLatestStory: body.showLatestStory });
  }

  if (Array.isArray(body.order)) {
    const ids = body.order as string[];
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.linkHubItem.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}

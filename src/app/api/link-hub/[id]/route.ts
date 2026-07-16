import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { fetchPagePreview } from '@/lib/link-hub';
import { cacheRemoteImageToR2 } from '@/lib/r2-put';

async function requireStaff() {
  const session = await auth();
  if (!session?.user) return null;
  const role = session.user.role;
  if (role !== 'ADMIN' && role !== 'EDITOR') return null;
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.linkHubItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Auto-fetch OG image and optionally cache to R2
  if (body.action === 'fetchPreview') {
    const preview = await fetchPagePreview(existing.url);
    if (!preview.imageUrl) {
      return NextResponse.json(
        { error: preview.error || 'No preview image found on that page' },
        { status: 422 }
      );
    }
    const cached =
      (await cacheRemoteImageToR2(preview.imageUrl, 'linkhub')) || preview.imageUrl;

    const item = await prisma.linkHubItem.update({
      where: { id },
      data: {
        imageUrl: cached,
        showImage: true,
        ...(preview.title && !existing.label ? { label: preview.title.slice(0, 120) } : {}),
      },
    });
    return NextResponse.json({ item, preview });
  }

  if (body.action === 'clearImage') {
    const item = await prisma.linkHubItem.update({
      where: { id },
      data: { imageUrl: null, showImage: false },
    });
    return NextResponse.json({ item });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.label === 'string') data.label = body.label.trim();
  if (typeof body.url === 'string') data.url = body.url.trim();
  if (body.emoji !== undefined) {
    data.emoji = body.emoji ? String(body.emoji).slice(0, 16) : null;
  }
  if (body.imageUrl !== undefined) {
    data.imageUrl = body.imageUrl ? String(body.imageUrl) : null;
  }
  if (typeof body.showImage === 'boolean') data.showImage = body.showImage;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
  if (body.utmCampaign !== undefined) {
    data.utmCampaign = body.utmCampaign
      ? String(body.utmCampaign).slice(0, 80)
      : null;
  }

  const item = await prisma.linkHubItem.update({ where: { id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await prisma.linkHubItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  parseYoutubeId,
  streamContentUrl,
  streamEmbedUrl,
  streamThumbnailUrl,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '@/lib/videos';

async function requireEditor() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const role = session.user.role;
  if (role !== 'ADMIN' && role !== 'EDITOR' && role !== 'WRITER') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireEditor();
    if ('error' in gate && gate.error) return gate.error;

    const { id } = await context.params;
    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.seoTitle !== undefined) {
      data.seoTitle = body.seoTitle ? String(body.seoTitle).trim() : null;
    }
    if (body.seoKeywords !== undefined) {
      data.seoKeywords = body.seoKeywords ? String(body.seoKeywords).trim() : null;
    }
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    if (typeof body.showOnHome === 'boolean') data.showOnHome = body.showOnHome;
    if (typeof body.showInSidebar === 'boolean') data.showInSidebar = body.showInSidebar;
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(String(body.sortOrder), 10) || 0;
    if (body.durationSec !== undefined) {
      if (body.durationSec === null || body.durationSec === '') {
        data.durationSec = null;
      } else {
        const raw = String(body.durationSec).trim();
        if (/^\d+$/.test(raw)) {
          data.durationSec = parseInt(raw, 10);
        } else if (raw.includes(':')) {
          const parts = raw.split(':').map((p) => parseInt(p, 10));
          if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
            data.durationSec = parts[0] * 60 + parts[1];
          } else if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
            data.durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
        }
      }
    }

    // Allow re-pointing YouTube link
    if (body.youtubeUrl) {
      const videoId = parseYoutubeId(String(body.youtubeUrl));
      if (!videoId) {
        return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
      }
      data.platform = 'YOUTUBE';
      data.externalId = videoId;
      data.sourceUrl = String(body.youtubeUrl);
      data.embedUrl = youtubeEmbedUrl(videoId);
      data.thumbnailUrl = youtubeThumbnailUrl(videoId);
      data.contentUrl = youtubeWatchUrl(videoId);
    }

    // Refresh Stream media URLs if needed
    if (body.refreshStreamUrls && existing.platform === 'STREAM') {
      data.embedUrl = streamEmbedUrl(existing.externalId);
      data.thumbnailUrl = streamThumbnailUrl(existing.externalId);
      data.contentUrl = streamContentUrl(existing.externalId);
    }

    const video = await prisma.video.update({ where: { id }, data });
    return NextResponse.json({ video });
  } catch (error) {
    console.error('PATCH /api/videos/[id]', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireEditor();
    if ('error' in gate && gate.error) return gate.error;

    const { id } = await context.params;
    await prisma.video.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/videos/[id]', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Delete failed' },
      { status: 500 }
    );
  }
}

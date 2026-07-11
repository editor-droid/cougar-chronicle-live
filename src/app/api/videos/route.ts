import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { generateVideoSeo } from '@/lib/video-seo';
import {
  fetchStreamDetails,
  fetchYoutubeOEmbed,
  parseYoutubeId,
  slugifyVideoTitle,
  streamContentUrl,
  streamEmbedUrl,
  streamThumbnailUrl,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '@/lib/videos';

async function uniqueVideoSlug(title: string): Promise<string> {
  const base = slugifyVideoTitle(title);
  let slug = base;
  let n = 0;
  while (true) {
    const existing = await prisma.video.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function parseDurationSec(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  const s = String(value).trim();
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return n > 0 ? n : null;
  }
  // m:ss or h:mm:ss
  const parts = s.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placement = searchParams.get('placement');
  const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10) || 12, 50);

  const where: {
    isActive: boolean;
    showOnHome?: boolean;
    showInSidebar?: boolean;
  } = { isActive: true };

  if (placement === 'home') where.showOnHome = true;
  if (placement === 'sidebar') where.showInSidebar = true;

  const videos = await prisma.video.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    take: limit,
  });

  return NextResponse.json({ videos });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'EDITOR' && role !== 'WRITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const platform = String(body.platform || '').toUpperCase();
    let title = (body.title as string | undefined)?.trim() || '';
    let description = (body.description as string | undefined)?.trim() || null;
    let seoTitle = (body.seoTitle as string | undefined)?.trim() || null;
    let seoKeywords = (body.seoKeywords as string | undefined)?.trim() || null;
    const showOnHome = body.showOnHome !== false;
    const showInSidebar = body.showInSidebar !== false;
    const isActive = body.isActive !== false;
    let durationSec = parseDurationSec(body.durationSec);
    const skipAi = body.skipAi === true;

    if (platform === 'YOUTUBE') {
      const raw = String(body.youtubeUrl || body.sourceUrl || body.externalId || '');
      const videoId = parseYoutubeId(raw);
      if (!videoId) {
        return NextResponse.json(
          { error: 'Valid YouTube URL or video ID required' },
          { status: 400 }
        );
      }

      const oembed = await fetchYoutubeOEmbed(videoId);
      if (!title && oembed?.title) title = oembed.title;
      if (!title) title = 'YouTube video';

      // Auto AI SEO when description/keywords missing (keeps publish under ~2 min)
      if (!skipAi && (!description || !seoKeywords || !seoTitle)) {
        try {
          const seo = await generateVideoSeo({
            title,
            platform: 'YOUTUBE',
            context: oembed?.title
              ? `YouTube title: ${oembed.title}${oembed.authorName ? `. Channel: ${oembed.authorName}` : ''}`
              : null,
          });
          if (!description) description = seo.description;
          if (!seoTitle) seoTitle = seo.seoTitle;
          if (!seoKeywords) seoKeywords = seo.seoKeywords;
        } catch (e) {
          console.error('Auto video SEO failed (continuing publish)', e);
          if (!description) {
            description = `${title} — video from The Cougar Chronicle.`;
          }
        }
      }

      if (!description) {
        return NextResponse.json(
          { error: 'Description is required (or let AI generate it)' },
          { status: 400 }
        );
      }

      const slug = await uniqueVideoSlug(title);
      const thumbnailUrl = oembed?.thumbnailUrl || youtubeThumbnailUrl(videoId);

      const video = await prisma.video.create({
        data: {
          title,
          slug,
          description,
          seoTitle,
          seoKeywords,
          platform: 'YOUTUBE',
          externalId: videoId,
          sourceUrl: raw.startsWith('http') ? raw : youtubeWatchUrl(videoId),
          embedUrl: youtubeEmbedUrl(videoId),
          thumbnailUrl,
          contentUrl: youtubeWatchUrl(videoId),
          durationSec,
          showOnHome,
          showInSidebar,
          isActive,
        },
      });

      return NextResponse.json({ video }, { status: 201 });
    }

    if (platform === 'STREAM') {
      const uid = String(body.externalId || body.uid || '').trim();
      if (!uid) {
        return NextResponse.json(
          { error: 'Stream video uid is required after upload' },
          { status: 400 }
        );
      }
      if (!title) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }

      const streamMeta = await fetchStreamDetails(uid);
      if (durationSec == null && streamMeta?.durationSec) {
        durationSec = streamMeta.durationSec;
      }

      if (!skipAi && (!description || !seoKeywords || !seoTitle)) {
        try {
          const seo = await generateVideoSeo({
            title,
            platform: 'STREAM',
            context: durationSec ? `Approx duration: ${durationSec} seconds` : null,
          });
          if (!description) description = seo.description;
          if (!seoTitle) seoTitle = seo.seoTitle;
          if (!seoKeywords) seoKeywords = seo.seoKeywords;
        } catch (e) {
          console.error('Auto video SEO failed (continuing publish)', e);
          if (!description) {
            description = `${title} — video from The Cougar Chronicle.`;
          }
        }
      }

      if (!description) {
        return NextResponse.json(
          { error: 'Description is required (or let AI generate it)' },
          { status: 400 }
        );
      }

      const slug = await uniqueVideoSlug(title);

      const video = await prisma.video.create({
        data: {
          title,
          slug,
          description,
          seoTitle,
          seoKeywords,
          platform: 'STREAM',
          externalId: uid,
          sourceUrl: null,
          embedUrl: streamEmbedUrl(uid),
          thumbnailUrl: streamMeta?.thumbnailUrl || streamThumbnailUrl(uid),
          contentUrl: streamContentUrl(uid),
          durationSec,
          showOnHome,
          showInSidebar,
          isActive,
        },
      });

      return NextResponse.json({ video }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'platform must be YOUTUBE or STREAM' },
      { status: 400 }
    );
  } catch (error) {
    console.error('POST /api/videos', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create video' },
      { status: 500 }
    );
  }
}

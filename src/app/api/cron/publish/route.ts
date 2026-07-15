import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastPostPublication } from '@/lib/publish-utils';
import { syncArticleVideosToLibrary } from '@/lib/article-videos';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Optional: Check authorization headers if you want to secure the cron
  // Vercel Cron sends a Bearer token in the request header
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all scheduled posts whose time has passed
    const postsToPublish = await prisma.post.findMany({
      where: {
        state: 'APPROVED',
        publishedAt: {
          lte: now,
          not: null,
        },
      },
      include: {
        author: true,
      },
    });

    if (postsToPublish.length === 0) {
      return NextResponse.json({ success: true, message: 'No posts to publish at this time.' });
    }

    let publishedCount = 0;

    for (const post of postsToPublish) {
      // 1. Update state to PUBLISHED
      const published = await prisma.post.update({
        where: { id: post.id },
        data: { state: 'PUBLISHED' },
      });

      // 2. Stream/YouTube embeds → /videos library + schema
      try {
        await syncArticleVideosToLibrary(published);
      } catch (e) {
        console.error('Failed to sync article videos for', post.id, e);
      }

      // 3. Fire the broadcast emails
      await broadcastPostPublication(post);
      
      publishedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully published ${publishedCount} scheduled post(s).` 
    });
  } catch (error) {
    console.error('Failed to run scheduled publish cron:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

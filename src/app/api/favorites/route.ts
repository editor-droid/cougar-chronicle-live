import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const postId = typeof body.postId === 'string' ? body.postId : null;
    const videoId = typeof body.videoId === 'string' ? body.videoId : null;

    if (!postId && !videoId) {
      return NextResponse.json(
        { error: 'Missing postId or videoId' },
        { status: 400 }
      );
    }
    if (postId && videoId) {
      return NextResponse.json(
        { error: 'Pass postId or videoId, not both' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    if (videoId) {
      const video = await prisma.video.findFirst({
        where: { id: videoId, isActive: true },
        select: { id: true },
      });
      if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      const existing = await prisma.videoFavorite.findUnique({
        where: { userId_videoId: { userId, videoId } },
      });

      if (existing) {
        await prisma.videoFavorite.delete({ where: { id: existing.id } });
        return NextResponse.json({ success: true, isFavorited: false });
      }

      await prisma.videoFavorite.create({
        data: { userId, videoId },
      });
      return NextResponse.json({ success: true, isFavorited: true });
    }

    // Article favorite
    const existing = await prisma.favorite.findUnique({
      where: { userId_postId: { userId, postId: postId! } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, isFavorited: false });
    }

    await prisma.favorite.create({
      data: { userId, postId: postId! },
    });
    return NextResponse.json({ success: true, isFavorited: true });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

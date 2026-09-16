import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { cacheRemoteImageToR2 } from '@/lib/r2-put';
import { rateLimit } from '@/lib/rate-limit';
import { isSharedMediaUrl, rewriteMediaUrl } from '@/lib/media-url';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = rateLimit(`rehost:${session.user.id}`, 40, 15 * 60 * 1000);
    if (!success) {
      return NextResponse.json({ error: 'Too many image imports. Try again shortly.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }
    if (url.length > 8000) {
      return NextResponse.json({ error: 'URL too long' }, { status: 400 });
    }
    if (url.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Paste the image file instead of a data URL' },
        { status: 400 }
      );
    }

    if (isSharedMediaUrl(url)) {
      return NextResponse.json({ publicUrl: rewriteMediaUrl(url) });
    }

    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Unsupported image URL' }, { status: 400 });
    }

    const publicUrl = await cacheRemoteImageToR2(url, 'blog-images');
    if (!publicUrl) {
      return NextResponse.json(
        { error: 'Could not copy that image into Chronicle storage' },
        { status: 422 }
      );
    }

    return NextResponse.json({ publicUrl });
  } catch (error) {
    console.error('Image rehost failed', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

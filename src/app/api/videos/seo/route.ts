import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateVideoSeo } from '@/lib/video-seo';
import { fetchYoutubeOEmbed, parseYoutubeId } from '@/lib/videos';

/**
 * POST { title, platform?, youtubeUrl?, context? }
 * Returns { description, seoTitle, seoKeywords }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'EDITOR' && role !== 'WRITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    let title = String(body.title || '').trim();
    const platform = body.platform ? String(body.platform).toUpperCase() : undefined;
    let context = body.context ? String(body.context) : '';

    if (body.youtubeUrl) {
      const id = parseYoutubeId(String(body.youtubeUrl));
      if (id) {
        const oembed = await fetchYoutubeOEmbed(id);
        if (oembed?.title) {
          if (!title) title = oembed.title;
          context = [context, `YouTube title: ${oembed.title}`, oembed.authorName ? `Channel: ${oembed.authorName}` : '']
            .filter(Boolean)
            .join('. ');
        }
      }
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required for AI SEO' }, { status: 400 });
    }

    const seo = await generateVideoSeo({ title, platform, context });
    return NextResponse.json(seo);
  } catch (error: unknown) {
    console.error('Video SEO generation error', error);
    const err = error as { statusCode?: number; message?: string };
    if (err?.statusCode === 429 || err?.message?.includes('429') || err?.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in a moment.' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate video SEO', details: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

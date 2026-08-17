import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const body = await req.json();

    // Preference-only update needs an existing subscription endpoint from client
    if (body.preferencesOnly && body.endpoint) {
      const prefs = body.prefs || {};
      await prisma.pushSubscription.updateMany({
        where: { endpoint: body.endpoint },
        data: {
          wantsNews: prefs.wantsNews ?? true,
          wantsCampus: prefs.wantsCampus ?? true,
          wantsPolitics: prefs.wantsPolitics ?? true,
          wantsFaith: prefs.wantsFaith ?? true,
          wantsOpinion: prefs.wantsOpinion ?? true,
          wantsVideos: prefs.wantsVideos ?? true,
          wantsBreaking: prefs.wantsBreaking ?? true,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (!body?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const keys = body.keys || {};
    const prefs = body.prefs || {};

    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: {
        p256dh: keys.p256dh || body.p256dh,
        auth: keys.auth || body.auth,
        userId: session?.user?.id || null,
        ...(prefs.wantsNews !== undefined && { wantsNews: !!prefs.wantsNews }),
        ...(prefs.wantsCampus !== undefined && { wantsCampus: !!prefs.wantsCampus }),
        ...(prefs.wantsPolitics !== undefined && { wantsPolitics: !!prefs.wantsPolitics }),
        ...(prefs.wantsFaith !== undefined && { wantsFaith: !!prefs.wantsFaith }),
        ...(prefs.wantsOpinion !== undefined && { wantsOpinion: !!prefs.wantsOpinion }),
        ...(prefs.wantsVideos !== undefined && { wantsVideos: !!prefs.wantsVideos }),
        ...(prefs.wantsBreaking !== undefined && { wantsBreaking: !!prefs.wantsBreaking }),
      },
      create: {
        endpoint: body.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: session?.user?.id || null,
        wantsNews: prefs.wantsNews ?? true,
        wantsCampus: prefs.wantsCampus ?? true,
        wantsPolitics: prefs.wantsPolitics ?? true,
        wantsFaith: prefs.wantsFaith ?? true,
        wantsOpinion: prefs.wantsOpinion ?? true,
        wantsVideos: prefs.wantsVideos ?? true,
        wantsBreaking: prefs.wantsBreaking ?? true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

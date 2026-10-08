import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';
import {
  isMarketingConfigured,
  isValidEmail,
  newsletterDonateHtml,
  newsletterEmailFooter,
  newsletterStoryRowHtml,
  withUtm,
} from '@/lib/email';
import { segmentNameForDigest } from '@/lib/marketing-segments';
import { sendMarketingBroadcast } from '@/lib/resend-marketing';
import { digestAudienceMask, subscriberMatchesPost } from '@/lib/subscriber-prefs';
import { emailVideoThumbnailUrl } from '@/lib/videos';

export const dynamic = 'force-dynamic';

/** Weekly digest for subscribers with wantsDigest (and not instant-only). */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const posts = await prisma.post.findMany({
      where: {
        state: 'PUBLISHED',
        publishedAt: { gte: since, lte: new Date() },
      },
      orderBy: { publishedAt: 'desc' },
      take: 12,
      include: { author: true },
    });

    const videos = await prisma.video.findMany({
      where: { isActive: true, publishedAt: { gte: since } },
      orderBy: { publishedAt: 'desc' },
      take: 4,
    });

    if (posts.length === 0 && videos.length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing new this week.' });
    }

    const subscribers = await prisma.subscriber.findMany({
      where: { isActive: true, wantsDigest: true },
      select: {
        email: true,
        wantsNews: true,
        wantsCampus: true,
        wantsPolitics: true,
        wantsFaith: true,
        wantsOpinion: true,
        wantsVideos: true,
      },
    });

    const origin = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';
    if (!isMarketingConfigured()) {
      return NextResponse.json({ error: 'Resend marketing is not configured' }, { status: 500 });
    }

    const groups = new Map<number, typeof subscribers>();
    for (const sub of subscribers) {
      if (!isValidEmail(sub.email)) continue;
      const mask = digestAudienceMask(sub);
      const list = groups.get(mask);
      if (list) list.push(sub);
      else groups.set(mask, [sub]);
    }

    let sent = 0;
    let restricted = false;
    const day = new Date().toISOString().slice(0, 10);
    for (const [mask, subs] of groups) {
      if (restricted) break;
      const sample = subs[0];
      const filtered = posts.filter((p) => subscriberMatchesPost(sample, p));
      const vidList = sample.wantsVideos ? videos : [];
      if (filtered.length === 0 && vidList.length === 0) continue;

      const postHtml = filtered
        .map((p) => {
          const href = withUtm(`${origin}${getArticleUrl(p)}`, {
            source: 'newsletter',
            medium: 'email',
            campaign: 'weekly-digest',
          });
          return newsletterStoryRowHtml({
            href,
            title: p.title,
            meta: `${p.category}${p.isBreaking ? ' · Breaking' : ''}`,
            imageSrc: p.imageUrl,
            imageAlt: p.featuredImageAlt || p.title,
            origin,
          });
        })
        .join('');

      const videoHtml =
        vidList.length > 0
          ? `<h3 style="color:#1B2253;font-family:Georgia,serif;margin:8px 0 16px 0;">Videos</h3>${vidList
              .map((v) => {
                const href = withUtm(`${origin}/videos/${v.slug}`, {
                  source: 'newsletter',
                  medium: 'email',
                  campaign: 'weekly-digest',
                });
                return newsletterStoryRowHtml({
                  href,
                  title: v.title,
                  meta: 'Video',
                  imageSrc: emailVideoThumbnailUrl(v),
                  imageAlt: v.title,
                  origin,
                });
              })
              .join('')}`
          : '';

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1A1A1A;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#1B2253;font-family:Georgia,serif;font-size:28px;letter-spacing:-0.04em;text-transform:uppercase;">The Cougar Chronicle</h1>
            <p style="color:#6B7280;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Weekly Digest</p>
          </div>
          <p style="font-size:16px;line-height:1.5;color:#444;">Here is what we published this week.</p>
          ${filtered.length ? `<div style="margin:24px 0;">${postHtml}</div>` : ''}
          ${videoHtml}
          ${newsletterDonateHtml({ origin, campaign: 'newsletter-donate', sourceDetail: 'weekly-digest' })}
          <p style="margin-top:28px;"><a href="${origin}/membership?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest" style="display:inline-block;background:#1B2253;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:bold;">Become a Member — $48/year</a></p>
          ${newsletterEmailFooter(origin)}
        </div>
      `;

      const result = await sendMarketingBroadcast({
        segmentName: segmentNameForDigest(mask),
        emails: subs.map((s) => s.email),
        subject: 'This week at The Cougar Chronicle',
        html,
        name: `Weekly digest ${day} ${mask}`,
        previewText: 'This week at The Cougar Chronicle',
        idempotencyKey: `digest-${day}-${mask}`,
      });
      if (result.ok) sent += result.recipients;
      else if (result.restricted) restricted = true;
      else console.error('Digest fail', mask, result.error);
    }

    if (restricted && sent === 0) {
      return NextResponse.json(
        { error: 'Resend key cannot send marketing broadcasts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, posts: posts.length, sent });
  } catch (e) {
    console.error('Digest cron failed', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

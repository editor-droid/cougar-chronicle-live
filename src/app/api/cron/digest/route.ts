import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';
import { getArticleUrl } from '@/lib/routes';
import { isValidEmail, newsletterEmailFooter, withUtm } from '@/lib/email';

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
        wantsFaith: true,
        wantsOpinion: true,
        wantsVideos: true,
      },
    });

    const origin = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';
    const resend = new Resend(process.env.RESEND_API_KEY);
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
    }

    let sent = 0;
    for (const sub of subscribers) {
      if (!isValidEmail(sub.email)) continue;

      const filtered = posts.filter((p) => {
        if (p.isAmerica250) return true;
        // News / Opinion are format aggregates; Faith is still a topic category
        if (p.format === 'news') return sub.wantsNews;
        if (p.format === 'opinion') return sub.wantsOpinion;
        if (p.category === 'faith') return sub.wantsFaith;
        return true;
      });
      const vidList = sub.wantsVideos ? videos : [];
      if (filtered.length === 0 && vidList.length === 0) continue;

      const postHtml = filtered
        .map((p) => {
          const href = withUtm(`${origin}${getArticleUrl(p)}`, {
            source: 'newsletter',
            medium: 'email',
            campaign: 'weekly-digest',
          });
          return `<li style="margin-bottom:18px;"><a href="${href}" style="color:#1B2253;font-weight:bold;font-family:Georgia,serif;font-size:17px;text-decoration:none;">${p.title}</a><br/><span style="color:#6B7280;font-size:13px;text-transform:uppercase;">${p.category}${p.isBreaking ? ' · Breaking' : ''}</span></li>`;
        })
        .join('');

      const videoHtml =
        vidList.length > 0
          ? `<h3 style="color:#1B2253;font-family:Georgia,serif;">Videos</h3><ul style="list-style:none;padding:0;">${vidList
              .map((v) => {
                const href = withUtm(`${origin}/videos/${v.slug}`, {
                  source: 'newsletter',
                  medium: 'email',
                  campaign: 'weekly-digest',
                });
                return `<li style="margin-bottom:12px;"><a href="${href}" style="color:#1B2253;font-weight:bold;">${v.title}</a></li>`;
              })
              .join('')}</ul>`
          : '';

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1A1A1A;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#1B2253;font-family:Georgia,serif;font-size:28px;letter-spacing:-0.04em;text-transform:uppercase;">The Cougar Chronicle</h1>
            <p style="color:#6B7280;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Weekly Digest</p>
          </div>
          <p style="font-size:16px;line-height:1.5;color:#444;">Here&apos;s what we published this week.</p>
          ${filtered.length ? `<ul style="list-style:none;padding:0;margin:24px 0;">${postHtml}</ul>` : ''}
          ${videoHtml}
          <p style="margin-top:28px;"><a href="${origin}/membership?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-digest" style="display:inline-block;background:#1B2253;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:bold;">Become a Member — $48/year</a></p>
          ${newsletterEmailFooter(origin, sub.email)}
        </div>
      `;

      const result = await resend.emails.send({
        from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
        to: sub.email,
        subject: 'This week at The Cougar Chronicle',
        html,
      });
      if (!result.error) sent += 1;
      else console.error('Digest fail', sub.email, result.error);
    }

    return NextResponse.json({ success: true, posts: posts.length, sent });
  } catch (e) {
    console.error('Digest cron failed', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

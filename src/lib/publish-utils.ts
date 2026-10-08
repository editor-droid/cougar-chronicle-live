import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';
import { sendPushNotification, topicsForPost } from './push';
import {
  escapeEmailHtml,
  isMarketingConfigured,
  isResendConfigured,
  isValidEmail,
  newsletterDonateHtml,
  newsletterEmailFooter,
  newsletterHeroImageHtml,
  newsletterStoryRowHtml,
  sendOneEmail,
  withUtm,
} from './email';
import { segmentNameForPost, VIDEO_SEGMENT_NAME } from './marketing-segments';
import { sendMarketingBroadcast } from './resend-marketing';
import { subscriberWhereForPost } from './subscriber-prefs';
import { emailVideoThumbnailUrl } from './videos';

export async function broadcastPostPublication(
  post: any,
  options?: { skipAuthorEmail?: boolean }
) {
  const configured = isResendConfigured();

  if (post.author?.email && !options?.skipAuthorEmail) {
    const subject = `Your post is now live: ${post.title}`;
    const html = `<p>Congratulations! Your post "<strong>${post.title}</strong>" has been published.</p><p><a href="https://thecougarchronicle.com${getArticleUrl(post)}">View it live here</a></p>`;

    console.log(`\n[EMAIL] Publication → ${post.author.email}: ${subject}\n`);

    if (configured) {
      try {
        await sendOneEmail({
          to: post.author.email,
          subject,
          html,
        });
      } catch (e) {
        console.error('Failed to notify author of publication', e);
      }
    }
  }

  try {
    const pastPosts = await prisma.post.findMany({
      where: { state: 'PUBLISHED', id: { not: post.id }, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
      take: 3,
      select: {
        title: true,
        slug: true,
        imageUrl: true,
        featuredImageAlt: true,
        isPremium: true,
        printEditionId: true,
        category: true,
        isBreaking: true,
      },
    });

    const excerpt = post.content
      ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...'
      : 'Read our latest article.';
    const origin = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';

    let pastPostsHtml = '';
    if (pastPosts.length > 0) {
      pastPostsHtml = `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E3D8;">
          <h3 style="color: #1B2253; font-family: Georgia, serif;">Recent Stories</h3>
          ${pastPosts
            .map((p) => {
              const href = withUtm(`${origin}${getArticleUrl(p)}`, {
                source: 'newsletter',
                medium: 'email',
                campaign: 'new-post-related',
              });
              const meta = `${p.category}${p.isBreaking ? ' · Breaking' : ''}`;
              return newsletterStoryRowHtml({
                href,
                title: p.title,
                meta,
                imageSrc: p.imageUrl,
                imageAlt: p.featuredImageAlt || p.title,
                origin,
              });
            })
            .join('')}
        </div>
      `;
    }

    console.log(
      `\n[BROADCAST] Article category=${post.category} format=${post.format} breaking=${!!post.isBreaking} title=${post.title}\n`
    );

    if (!isMarketingConfigured()) {
      console.error('[BROADCAST] Resend marketing is not configured — not sending list email');
    } else {
      // Instant email: wantsInstant + matching topic (or breaking / America 250).
      // Weekly digesters still get the digest cron in addition.
      const whereClause = subscriberWhereForPost(post);

      const subscribers = await prisma.subscriber.findMany({
        where: whereClause,
        select: { email: true },
      });
      const emails = subscribers.map((s) => s.email.trim()).filter(isValidEmail);

      if (emails.length > 0) {
        const subjectPrefix = post.isBreaking
          ? 'BREAKING'
          : post.isAmerica250
            ? 'America 250'
            : 'New Post';
        const articlePath = getArticleUrl(post);
        const articleHref = withUtm(`${origin}${articlePath}`, {
          source: 'newsletter',
          medium: 'email',
          campaign: post.isBreaking
            ? 'breaking'
            : post.isAmerica250
              ? 'america-250'
              : 'new-post',
        });
        const heroHtml = newsletterHeroImageHtml({
          src: post.imageUrl,
          href: articleHref,
          alt: post.featuredImageAlt || post.title,
          origin,
        });
        const titleHtml = escapeEmailHtml(post.title);
        const bylineHtml = escapeEmailHtml(post.author?.name || post.customAuthor || 'Staff');
        const excerptHtml = escapeEmailHtml(excerpt);
        const articleHrefAttr = escapeEmailHtml(articleHref);
        const donateHtml =
          post.showDonateCta === false
            ? ''
            : newsletterDonateHtml({
                origin,
                campaign: 'newsletter-donate',
                sourceDetail: post.slug,
              });
        const subject = `${subjectPrefix}: ${post.title}`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1B2253; font-family: Georgia, serif; font-size: 32px; letter-spacing: -0.05em; text-transform: uppercase;">The Cougar Chronicle</h1>
        </div>
        ${
          post.isBreaking
            ? `<p style="color: #b91c1c; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Breaking</p>`
            : post.isAmerica250
              ? `<p style="color: #6B7280; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">America 250</p>`
              : ''
        }
        <h2 style="font-family: Georgia, serif; font-size: 24px; color: #1A1A1A; line-height: 1.3;">
          <a href="${articleHrefAttr}" style="color: #1A1A1A; text-decoration: none;">${titleHtml}</a>
        </h2>
        <p style="color: #6B7280; font-size: 14px; font-weight: bold; text-transform: uppercase;">By ${bylineHtml}</p>
        ${heroHtml}
        <p style="font-size: 16px; line-height: 1.6; color: #444;">${excerptHtml}</p>
        <div style="margin-top: 25px;">
          <a href="${articleHrefAttr}" style="display: inline-block; background-color: #1B2253; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Read Full Article</a>
        </div>
        ${pastPostsHtml}
        ${donateHtml}
        ${newsletterEmailFooter(origin)}
      </div>`;
        const sent = await sendMarketingBroadcast({
          segmentName: segmentNameForPost(post),
          emails,
          subject,
          html,
          name: subject,
          previewText: excerpt,
          idempotencyKey: `post-${post.id}`,
        });
        if (sent.ok) console.log(`Instant email queued for ${sent.recipients} subscribers.`);
        else console.error('[BROADCAST] marketing send failed', sent.error);
      } else {
        console.log('No instant-email subscribers for this post (digest-only list waits for weekly cron).');
      }
    }

    const pushTitle = post.isBreaking
      ? `BREAKING: ${post.title}`
      : post.isAmerica250
        ? `America 250: ${post.title}`
        : `New Post: ${post.title}`;
    await sendPushNotification(pushTitle, excerpt, getArticleUrl(post), {
      topics: topicsForPost(post),
    });
  } catch (broadcastError) {
    console.error('Failed to trigger broadcast:', broadcastError);
  }
}

export async function broadcastVideoPublication(video: {
  title: string;
  slug: string;
  description?: string | null;
  platform?: string | null;
  externalId?: string | null;
  thumbnailUrl?: string | null;
}) {
  const origin = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';
  const url = `/videos/${video.slug}`;
  const raw = (video.description || 'Watch our latest video from The Cougar Chronicle.').replace(
    /<[^>]*>?/gm,
    ''
  );
  const excerpt = raw.length > 200 ? raw.substring(0, 200) + '...' : raw;

  console.log(`\n[BROADCAST] Video title=${video.title}\n`);

  if (isMarketingConfigured()) {
    try {
      const subscribers = await prisma.subscriber.findMany({
        where: { isActive: true, wantsVideos: true, wantsInstant: true },
        select: { email: true },
      });
      const emails = subscribers.map((s) => s.email.trim()).filter(isValidEmail);

      if (emails.length > 0) {
        const videoHref = withUtm(`${origin}${url}`, {
          source: 'newsletter',
          medium: 'email',
          campaign: 'new-video',
        });
        const thumbHtml = newsletterHeroImageHtml({
          src: emailVideoThumbnailUrl(video),
          href: videoHref,
          alt: video.title,
          origin,
        });
        const titleHtml = escapeEmailHtml(video.title);
        const excerptHtml = escapeEmailHtml(excerpt);
        const videoHrefAttr = escapeEmailHtml(videoHref);
        const subject = `New Video: ${video.title}`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1B2253; font-family: Georgia, serif; font-size: 32px; letter-spacing: -0.05em; text-transform: uppercase;">The Cougar Chronicle</h1>
        </div>
        <p style="color: #6B7280; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">New Video</p>
        <h2 style="font-family: Georgia, serif; font-size: 24px; color: #1A1A1A; line-height: 1.3;">
          <a href="${videoHrefAttr}" style="color: #1A1A1A; text-decoration: none;">${titleHtml}</a>
        </h2>
        ${thumbHtml}
        <p style="font-size: 16px; line-height: 1.6; color: #444;">${excerptHtml}</p>
        <div style="margin-top: 25px;">
          <a href="${videoHrefAttr}" style="display: inline-block; background-color: #1B2253; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Watch Video</a>
        </div>
        ${newsletterDonateHtml({ origin, campaign: 'newsletter-donate', sourceDetail: video.slug })}
        ${newsletterEmailFooter(origin)}
      </div>`;
        const sent = await sendMarketingBroadcast({
          segmentName: VIDEO_SEGMENT_NAME,
          emails,
          subject,
          html,
          name: subject,
          previewText: excerpt,
          idempotencyKey: `video-${video.slug}`,
        });
        if (sent.ok) console.log(`Video email queued for ${sent.recipients} subscribers.`);
        else console.error('[BROADCAST] video marketing send failed', sent.error);
      } else {
        console.log('No subscribers opted into video emails.');
      }
    } catch (e) {
      console.error('Failed to email video broadcast:', e);
    }
  }

  try {
    await sendPushNotification(`New Video: ${video.title}`, excerpt, url, {
      topics: ['videos'],
    });
  } catch (e) {
    console.error('Failed to send video push:', e);
  }
}

import prisma from '@/lib/prisma';
import { Resend } from 'resend';
import { getArticleUrl } from '@/lib/routes';
import { sendPushNotification } from './push';
import { isValidEmail } from './email';

const resend = new Resend(process.env.RESEND_API_KEY || 're_fallback_key_so_build_does_not_crash');

export async function broadcastPostPublication(
  post: any,
  options?: { skipAuthorEmail?: boolean }
) {
  const isMock = !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes('fallback');

  // 1. Email the author (skipped on manual re-sends)
  if (post.author?.email && !options?.skipAuthorEmail) {
    const subject = `Your post is now live: ${post.title}`;
    const html = `<p>Congratulations! Your post "<strong>${post.title}</strong>" has been published.</p><p><a href="https://thecougarchronicle.com${getArticleUrl(post)}">View it live here</a></p>`;
    
    console.log(`\n=========================================\n[EMAIL NOTIFICATION] Publication\nTo: ${post.author.email}\nSubject: ${subject}\n=========================================\n`);

    if (!isMock) {
      try {
        await resend.emails.send({
          from: 'notifications@thecougarchronicle.com',
          to: post.author.email,
          subject,
          html
        });
      } catch (e) {
        console.error('Failed to notify author of publication', e);
      }
    }
  }

  // 2. BROADCAST TO SUBSCRIBERS
  try {
    const pastPosts = await prisma.post.findMany({
      where: { state: 'PUBLISHED', id: { not: post.id }, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
      take: 3,
    });

    const excerpt = post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...' : 'Read our latest article.';
    const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    let pastPostsHtml = '';
    if (pastPosts.length > 0) {
      pastPostsHtml = `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E3D8;">
          <h3 style="color: #1B2253; font-family: Georgia, serif;">Recent Stories</h3>
          <ul style="list-style: none; padding: 0;">
            ${pastPosts.map(p => `
              <li style="margin-bottom: 15px;">
                <a href="${origin}${getArticleUrl(p)}" style="color: #1B2253; text-decoration: none; font-weight: bold; font-family: Georgia, serif; font-size: 16px;">${p.title}</a>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    const broadcastHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1B2253; font-family: Georgia, serif; font-size: 32px; letter-spacing: -0.05em; text-transform: uppercase;">The Cougar Chronicle</h1>
        </div>
        
        <h2 style="font-family: Georgia, serif; font-size: 24px; color: #1A1A1A; line-height: 1.3;">
          <a href="${origin}${getArticleUrl(post)}" style="color: #1A1A1A; text-decoration: none;">${post.title}</a>
        </h2>
        <p style="color: #6B7280; font-size: 14px; font-weight: bold; text-transform: uppercase;">By ${post.author?.name || post.customAuthor || 'Staff'}</p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #444;">${excerpt}</p>
        
        <div style="margin-top: 25px;">
          <a href="${origin}${getArticleUrl(post)}" style="display: inline-block; background-color: #1B2253; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Read Full Article</a>
        </div>

        ${pastPostsHtml}

        <hr style="border: none; border-top: 1px solid #eaeaea; margin-top: 40px; margin-bottom: 20px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          You are receiving this because you subscribed to The Cougar Chronicle. 
        </p>
      </div>
    `;

    console.log(`\n=========================================\n[BROADCAST NOTIFICATION] Triggering Batched Email\nCategory: ${post.category}\nSubject: New Post: ${post.title}\n=========================================\n`);

    if (!isMock) {
      // America 250 / special series → all active subs.
      // Otherwise filter by category preference (news / faith / opinion).
      const whereClause: { isActive: boolean; wantsNews?: boolean; wantsFaith?: boolean; wantsOpinion?: boolean } = {
        isActive: true,
      };
      if (!post.isAmerica250) {
        if (post.category === 'news') whereClause.wantsNews = true;
        else if (post.category === 'faith') whereClause.wantsFaith = true;
        else if (post.category === 'opinion') whereClause.wantsOpinion = true;
      }

      const subscribers = await prisma.subscriber.findMany({
        where: whereClause,
        select: { email: true },
      });
      const emails = subscribers.map((s) => s.email.trim()).filter(isValidEmail);

      if (emails.length > 0) {
        const subjectPrefix = post.isAmerica250 ? 'America 250' : 'New Post';
        const CHUNK_SIZE = 100;
        for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
          const chunk = emails.slice(i, i + CHUNK_SIZE);
          const payloads = chunk.map((email) => ({
            from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
            to: email,
            subject: `${subjectPrefix}: ${post.title}`,
            html: broadcastHtml,
          }));
          await resend.batch.send(payloads);
        }
        console.log(`Successfully sent to ${emails.length} subscribers.`);
      } else {
        console.log('No subscribers matched this post audience.');
      }

      await sendPushNotification(
        post.isAmerica250 ? `America 250: ${post.title}` : `New Post: ${post.title}`,
        excerpt,
        getArticleUrl(post)
      );
    }
  } catch (broadcastError) {
    console.error('Failed to trigger broadcast:', broadcastError);
  }
}

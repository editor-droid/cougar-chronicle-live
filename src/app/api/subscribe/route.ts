import { NextResponse } from 'next/server';
import { getArticleUrl } from '@/lib/routes';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import {
  getResend,
  isResendConfigured,
  isValidEmail,
  NEWSLETTER_FROM,
  sendOneEmail,
} from '@/lib/email';

const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '993e7864-bb3a-4543-a437-a7848b030657';

async function parseBody(req: Request): Promise<{
  email?: string;
  name?: string;
  website?: string;
  isForm: boolean;
}> {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await req.json();
    return {
      email: json.email,
      name: json.name,
      website: json.website,
      isForm: false,
    };
  }
  const form = await req.formData();
  return {
    email: String(form.get('email') || ''),
    name: String(form.get('name') || ''),
    website: String(form.get('website') || ''),
    isForm: true,
  };
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { success } = rateLimit(ip, 20, 60 * 1000);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { email: rawEmail, name, website, isForm } = await parseBody(req);

    if (website && website.trim() !== '') {
      console.log('Bot detected via honeypot on subscribe from', ip);
      return NextResponse.json({ success: true, message: 'Subscribed successfully' });
    }

    if (!rawEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const email = String(rawEmail).trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    if (email.toLowerCase().includes('cougarchronicle')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    try {
      await prisma.subscriber.upsert({
        where: { email },
        update: { isActive: true, name: name || undefined },
        create: { email, name: name || null },
      });
    } catch (dbError) {
      console.error('Database connection error during subscription:', dbError);
    }

    // Audience write is best-effort. Send-only API keys 401 here — never block the welcome email.
    if (isResendConfigured()) {
      try {
        const resend = getResend();
        const contactPayload = {
          email,
          firstName: name || undefined,
          unsubscribed: false,
          audienceId: AUDIENCE_ID,
        };
        const contactRes = await resend.contacts.create(contactPayload);
        if (contactRes.error) {
          console.error('Resend contact create error:', contactRes.error);
          const updateRes = await resend.contacts.update(contactPayload);
          if (updateRes.error) {
            console.error('Resend contact update error:', updateRes.error);
          }
        }
      } catch (audienceErr) {
        console.error('Resend audience sync failed (continuing to welcome email):', audienceErr);
      }
    }

    if (isResendConfigured()) {
      const origin =
        req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';
      const unsubLink = `${origin}/unsubscribe?email=${encodeURIComponent(email)}`;
      const greeting = name ? `Hi ${name},` : 'Hello,';

      let recentPostsHtml = '';
      try {
        const recentPosts = await prisma.post.findMany({
          where: { state: 'PUBLISHED' },
          orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
          take: 3,
        });

        if (recentPosts.length > 0) {
          recentPostsHtml = `
            <div style="margin-top: 30px; border-top: 2px solid #eaeaea; padding-top: 20px;">
              <h3 style="color: #1e293b; font-family: Georgia, serif; font-size: 18px; margin-bottom: 15px;">Catch up on our latest stories:</h3>
              ${recentPosts
                .map(
                  (post) => `
                <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                  ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" style="max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px;" />` : ''}
                  <a href="${origin}${getArticleUrl(post)}" style="text-decoration: none; color: #0f172a; font-family: Georgia, serif; font-size: 16px; font-weight: bold; display: block; margin-bottom: 5px;">${post.title}</a>
                  <p style="color: #475569; font-size: 14px; margin: 0;">${post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...' : 'Read our latest article.'}</p>
                </div>
              `
                )
                .join('')}
            </div>
          `;
        }
      } catch (err) {
        console.error('Failed to fetch recent posts for email:', err);
      }

      const emailRes = await sendOneEmail({
        from: NEWSLETTER_FROM,
        to: email,
        subject: 'Welcome to The Cougar Chronicle',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1e2b4d; padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; font-family: 'Cormorant Garamond', Georgia, serif; margin: 0; font-size: 28px; font-weight: 400; letter-spacing: 0.5px;">The Cougar Chronicle</h1>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Conservative News & Opinion</p>
            </div>
            <div style="padding: 30px 20px;">
              <h2 style="color: #0f172a; font-family: Georgia, serif; font-size: 22px; margin-top: 0;">Welcome to The Cougar Chronicle</h2>
              <p style="color: #334155; font-size: 16px; line-height: 1.6;">${greeting}</p>
              <p style="color: #334155; font-size: 16px; line-height: 1.6;">Thank you for subscribing to The Cougar Chronicle. You've joined a growing community dedicated to faithful, conservative reporting at BYU.</p>
              ${recentPostsHtml}
              <div style="margin-top: 30px; background-color: #f8fafc; padding: 20px; border-radius: 6px; text-align: center;">
                <p style="color: #334155; font-size: 14px; margin: 0;"><strong>Support our mission:</strong> We rely on readers like you to keep independent journalism alive on campus.</p>
                <a href="${origin}/donate" style="display: inline-block; background-color: #1e2b4d; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; margin-top: 15px; font-size: 14px;">Donate Today</a>
              </div>
            </div>
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} The Cougar Chronicle. All rights reserved.</p>
              <p style="font-size: 12px; color: #64748b; margin: 0;">
                You can <a href="${origin}/account" style="color: #1e2b4d; text-decoration: underline;">manage preferences</a>
                or <a href="${unsubLink}" style="color: #1e2b4d; text-decoration: underline;">unsubscribe</a> anytime.
              </p>
            </div>
          </div>
        `,
      });

      if (!emailRes.ok) {
        console.error('Welcome email failed after subscribe:', emailRes.error);
        // Subscriber is already in the DB — do not fail the signup.
      }
    }

    if (isForm) {
      const origin =
        req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';
      return NextResponse.redirect(new URL('/?subscribed=1', origin), 303);
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

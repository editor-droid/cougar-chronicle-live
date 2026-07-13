import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getArticleUrl } from '@/lib/routes';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { isValidEmail } from '@/lib/email';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '993e7864-bb3a-4543-a437-a7848b030657';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    // Note: The main issue was email harvesting (admin address exposed publicly and added to external spam lists).
    // Honeypot protects against bots. Rate limit is intentionally generous for legitimate subscribers.
    const { success } = rateLimit(ip, 20, 60 * 1000); // 20 per minute
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { email, name, website } = await req.json(); // website = honeypot

    if (website && website.trim() !== '') {
      console.log('Bot detected via honeypot on subscribe from', ip);
      return NextResponse.json({ success: true, message: 'Subscribed successfully' });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Prevent using our own domain in subscribe to avoid self-spam
    if (email.toLowerCase().includes('cougarchronicle')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Try to save to DB if it's available
    try {
      await prisma.subscriber.upsert({
        where: { email },
        update: { isActive: true, name: name || undefined },
        create: { email, name: name || null },
      });
    } catch (dbError) {
      console.error('Database connection error during subscription:', dbError);
    }

    // Add to Resend Audience
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder')) {
      const contactPayload = {
        email: email,
        firstName: name || undefined,
        unsubscribed: false,
        audienceId: AUDIENCE_ID,
      };

      const contactRes = await resend.contacts.create(contactPayload);
      
      if (contactRes.error) {
        console.error('Resend contact create error:', contactRes.error);
        // Try to update if it already exists
        const updateRes = await resend.contacts.update(contactPayload);
        if (updateRes.error) {
          console.error('Resend contact update error:', updateRes.error);
        }
      }
    }

    // Send welcome email via Resend
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder')) {
      const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || (process.env.NEXTAUTH_URL || 'http://localhost:3000');
      const unsubLink = `${origin}/unsubscribe?email=${encodeURIComponent(email)}`;
      const greeting = name ? `Hi ${name},` : 'Hello,';
      
      // Fetch recent posts for the email
      let recentPostsHtml = '';
      try {
        const recentPosts = await prisma.post.findMany({
          where: { state: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });
        
        if (recentPosts.length > 0) {
          recentPostsHtml = `
            <div style="margin-top: 30px; border-top: 2px solid #eaeaea; padding-top: 20px;">
              <h3 style="color: #1e293b; font-family: Georgia, serif; font-size: 18px; margin-bottom: 15px;">Catch up on our latest stories:</h3>
              ${recentPosts.map(post => `
                <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                  ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" style="max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 10px;" />` : ''}
                  <a href="${origin}${getArticleUrl(post)}" style="text-decoration: none; color: #0f172a; font-family: Georgia, serif; font-size: 16px; font-weight: bold; display: block; margin-bottom: 5px;">${post.title}</a>
                  <p style="color: #475569; font-size: 14px; margin: 0;">${post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...' : 'Read our latest article.'}</p>
                </div>
              `).join('')}
            </div>
          `;
        }
      } catch (err) {
        console.error('Failed to fetch recent posts for email:', err);
      }

      const emailRes = await resend.emails.send({
        from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
        to: email,
        subject: 'Welcome to The Cougar Chronicle',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            
            <!-- Header -->
            <div style="background-color: #1e2b4d; padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; font-family: 'Cormorant Garamond', Georgia, serif; margin: 0; font-size: 28px; font-weight: 400; letter-spacing: 0.5px;">The Cougar Chronicle</h1>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Conservative News & Opinion</p>
            </div>

            <!-- Body -->
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

            <!-- Footer -->
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

      if (emailRes.error) {
        console.error('Resend email error:', emailRes.error);
        return NextResponse.json({ error: 'Failed to send welcome email. ' + emailRes.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

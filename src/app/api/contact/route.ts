import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_fallback_key_so_build_does_not_crash');

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    // Honeypot + rate limit protects the form. 
    // The bigger past issue was the admin email being publicly visible on the site and harvested for external spam lists.
    const { success } = rateLimit(ip, 5, 5 * 60 * 1000); // 5 per 5 minutes
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { name, email, message, website } = body; // 'website' is honeypot

    // Honeypot check - if filled, it's a bot
    if (website && website.trim() !== '') {
      console.log('Bot detected via honeypot on contact form from', ip);
      return NextResponse.json({ success: true }); // Fake success to not alert bot
    }

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic validation to prevent self-abuse
    if (email.toLowerCase().includes('cougarchronicle')) {
      return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
      },
    });

    // Send email notification
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('fallback')) {
      await resend.emails.send({
        from: 'The Cougar Chronicle <notifications@updates.thecougarchronicle.com>',
        to: 'editor@thecougarchronicle.com',
        replyTo: email,
        subject: `New Contact Form Submission from ${name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e2b4d;">New Contact Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap; background: #f8f9fa; padding: 1rem; border-radius: 4px;">${message}</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error('Contact Submission Error:', error);
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 });
  }
}

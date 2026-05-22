import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '993e7864-bb3a-4543-a437-a7848b030657';

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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
    try {
      if (process.env.RESEND_API_KEY) {
        await resend.contacts.create({
          email: email,
          firstName: name || undefined,
          unsubscribed: false,
          audienceId: AUDIENCE_ID,
        });
      }
    } catch (contactError) {
      console.error('Resend contact sync error:', contactError);
    }

    // Send welcome email via Resend
    try {
      if (process.env.RESEND_API_KEY) {
        const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://cougar-chronicle-live-production-c994.up.railway.app';
        const unsubLink = `${origin}/unsubscribe?email=${encodeURIComponent(email)}`;
        const greeting = name ? `Hi ${name},` : 'Hello,';
        
        await resend.emails.send({
          from: 'The Cougar Chronicle <onboarding@resend.dev>', // Change to verified domain later
          to: email,
          subject: 'Welcome to The Cougar Chronicle',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to The Cougar Chronicle!</h2>
              <p>${greeting}</p>
              <p>Thank you for subscribing to our newsletter! You will now receive the latest conservative news and opinion from the BYU community directly in your inbox.</p>
              <br/>
              <p>Best regards,<br/>The Editorial Board</p>
              <hr style="border: none; border-top: 1px solid #eaeaea; margin-top: 30px; margin-bottom: 20px;" />
              <p style="font-size: 12px; color: #666; text-align: center;">
                If you didn't mean to subscribe, you can <a href="${unsubLink}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.
              </p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error('Resend email error:', emailError);
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

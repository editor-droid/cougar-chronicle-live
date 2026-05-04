import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Try to save to DB if it's available
    try {
      await prisma.subscriber.upsert({
        where: { email },
        update: { isActive: true },
        create: { email },
      });
    } catch (dbError) {
      console.error('Database connection error during subscription:', dbError);
      // We continue even if DB fails, to at least send the welcome email
    }

    // Send welcome email via Resend
    try {
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'The Cougar Chronicle <onboarding@resend.dev>', // Change to verified domain later
          to: email,
          subject: 'Welcome to The Cougar Chronicle',
          html: '<p>Thank you for subscribing to The Cougar Chronicle newsletter! You will now receive the latest conservative news and opinion from the BYU community directly in your inbox.</p>',
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

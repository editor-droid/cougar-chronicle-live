import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY || 're_fallback_key_so_build_does_not_crash');

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { success } = rateLimit(ip, 5, 10 * 60 * 1000); // 5 tips per 10 min
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { message, contactInfo, website } = await req.json();

    if (website && website.trim() !== '') {
      console.log('Bot detected on tips from', ip);
      return NextResponse.json({ success: true });
    }

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    await resend.emails.send({
      from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
      to: 'editor@thecougarchronicle.com',
      subject: 'New Secure Tip Received',
      html: `<p><strong>Secure Tip:</strong></p><p>${message}</p><p><strong>Contact Info (if provided):</strong> ${contactInfo || 'Anonymous'}</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse('Failed to send tip', { status: 500 });
  }
}

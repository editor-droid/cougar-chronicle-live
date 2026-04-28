import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_fallback_key_so_build_does_not_crash');

export async function POST(req: Request) {
  try {
    const { message, contactInfo } = await req.json();

    await resend.emails.send({
      from: 'tips@thecougarchronicle.com',
      to: 'editor@thecougarchronicle.com',
      subject: 'New Secure Tip Received',
      html: `<p><strong>Secure Tip:</strong></p><p>${message}</p><p><strong>Contact Info (if provided):</strong> ${contactInfo || 'Anonymous'}</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse('Failed to send tip', { status: 500 });
  }
}

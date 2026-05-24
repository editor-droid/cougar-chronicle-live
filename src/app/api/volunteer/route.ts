import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, interests, message } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
    }

    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder')) {
      const emailRes = await resend.emails.send({
        from: 'The Cougar Chronicle <notifications@updates.thecougarchronicle.com>',
        to: 'editor@thecougarchronicle.com',
        replyTo: email,
        subject: `New Volunteer Application: ${name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1e2b4d; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Volunteer Application</h1>
            </div>
            <div style="padding: 30px 20px;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
              <p><strong>Areas of Interest:</strong> ${interests?.length > 0 ? interests.join(', ') : 'None specified'}</p>
              
              <h3 style="margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Message/Experience:</h3>
              <p style="white-space: pre-wrap; color: #334155;">${message || 'No message provided.'}</p>
            </div>
          </div>
        `,
      });

      if (emailRes.error) {
        console.error('Resend email error:', emailRes.error);
        return NextResponse.json({ error: 'Failed to send application. ' + emailRes.error.message }, { status: 500 });
      }
    } else {
      console.log('No Resend API Key configured. Mocking volunteer email:', body);
    }

    return NextResponse.json({ success: true, message: 'Application submitted successfully!' });
  } catch (error) {
    console.error('Volunteer application error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

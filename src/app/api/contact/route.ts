import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        message,
      },
    });

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error('Contact Submission Error:', error);
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 });
  }
}

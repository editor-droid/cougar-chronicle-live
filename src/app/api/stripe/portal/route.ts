import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/** Stripe Customer Portal for cancel/update membership. */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeId: true, email: true },
    });

    if (!user?.stripeId) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe first, or contact support.' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16' as any,
    });
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeId,
      return_url: `${origin}/account`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error('[STRIPE_PORTAL]', e);
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: 500 });
  }
}

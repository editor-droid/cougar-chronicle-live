import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_fallback_so_build_does_not_crash') as string, {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === 'checkout.session.completed') {
    if (session.metadata?.type === 'subscription') {
      await prisma.user.update({
        where: { id: session.metadata.userId },
        data: { 
          isSubscribed: true,
          stripeId: session.customer as string,
          giftLinks: { increment: 3 } // Award 3 gift links
        }
      });
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await prisma.user.update({
      where: { stripeId: subscription.customer as string },
      data: { isSubscribed: true, giftLinks: { increment: 3 } }
    });
  }

  return new NextResponse('OK', { status: 200 });
}

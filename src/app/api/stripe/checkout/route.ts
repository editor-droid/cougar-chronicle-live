import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_fallback_so_build_does_not_crash') as string, {
  apiVersion: '2023-10-16' as any, // TypeScript workaround for stripe versioning
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { type, priceId } = await req.json();
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    let checkoutSession;

    if (type === 'subscription') {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: session.user.email || undefined,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${origin}/dashboard?success=true`,
        cancel_url: `${origin}/dashboard?canceled=true`,
        metadata: {
          userId: session.user.id,
          type: 'subscription'
        }
      });
    } else if (type === 'physical') {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        shipping_address_collection: {
          allowed_countries: ['US'],
        },
        customer_email: session.user.email || undefined,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${origin}/dashboard?success=true`,
        cancel_url: `${origin}/dashboard?canceled=true`,
        metadata: {
          userId: session.user.id,
          type: 'physical'
        }
      });
    }

    return NextResponse.json({ url: checkoutSession?.url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

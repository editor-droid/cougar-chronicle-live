import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_fallback_so_build_does_not_crash') as string, {
  apiVersion: '2023-10-16' as any, // TypeScript workaround for stripe versioning
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { type, amount, priceId, metadata, name } = await req.json();
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    let checkoutSession;

    // 1. DONATIONS (Custom Amount)
    if (type === 'donate') {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        submit_type: 'donate',
        payment_method_types: ['card'],
        customer_email: session?.user?.email || undefined,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Donation to The Cougar Chronicle',
                description: 'Support independent conservative journalism.',
              },
              unit_amount: amount * 100, // amount in cents
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/donate?success=true`,
        cancel_url: `${origin}/donate`,
        metadata: {
          type: 'donation'
        }
      });
    } 
    // 2. SINGLE DIGITAL ARTICLE
    else if (type === 'digital_article') {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: session?.user?.email || undefined,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Digital Article: ${name}`,
              },
              unit_amount: 199, // $1.99 per article
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/article/${metadata.slug}?success=true`,
        cancel_url: `${origin}/article/${metadata.slug}`,
        metadata: {
          type: 'digital_article',
          postId: metadata.postId,
          slug: metadata.slug
        }
      });
    }
    // 3. DIGITAL PRINT EDITION (PDF)
    else if (type === 'digital_print') {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: session?.user?.email || undefined,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Print Edition (Digital PDF Download)',
              },
              unit_amount: 1000, // $10.00
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/print-edition?success=digital`,
        cancel_url: `${origin}/print-edition`,
        metadata: {
          type: 'digital_print'
        }
      });
    }
    // 4. PHYSICAL PRINT EDITION
    else if (type === 'physical_print') {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        shipping_address_collection: {
          allowed_countries: ['US'],
        },
        customer_email: session?.user?.email || undefined,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Print Edition (Physical Copy)',
                description: 'Delivered straight to your door.',
              },
              unit_amount: 1500, // $15.00
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/print-edition?success=physical`,
        cancel_url: `${origin}/print-edition`,
        metadata: {
          type: 'physical_print'
        }
      });
    }
    // 5. SUBSCRIPTION FALLBACK
    else if (type === 'subscription' && priceId) {
      if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });
      checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: session.user.email || undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/dashboard?success=true`,
        cancel_url: `${origin}/dashboard`,
        metadata: { userId: session.user.id, type: 'subscription' }
      });
    }

    return NextResponse.json({ url: checkoutSession?.url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

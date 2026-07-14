import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_fallback_so_build_does_not_crash';
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any,
    });
    const session = await auth();
    const contentType = req.headers.get('content-type') || '';
    let type: string | undefined;
    let amount = 0;
    let priceId: string | undefined;
    let metadata: any = {};
    let name: string | undefined;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      type = body.type;
      amount = Number(body.amount || 0);
      priceId = body.priceId;
      metadata = body.metadata || {};
      name = body.name;
    } else {
      const formData = await req.formData();
      type = formData.get('type') as string;
      amount = Number(formData.get('amount') || 0);
      priceId = (formData.get('priceId') as string) || undefined;
      metadata = JSON.parse((formData.get('metadata') as string) || '{}');
      name = formData.get('name') as string;
    }
    const origin = req.headers.get('origin') || new URL(req.url).origin;

    let checkoutSession;

    if (type === 'donate') {
      const campaign = (metadata?.campaign as string) || '';
      const isAugustFundraiser = campaign === 'august_fundraiser';
      const successPath = isAugustFundraiser
        ? `/fundraiser?success=true&purchase=${amount}`
        : `/donate?success=true&purchase=${amount}`;
      const cancelPath = isAugustFundraiser ? '/fundraiser' : '/donate';

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
                name: isAugustFundraiser
                  ? 'August Fundraising Drive — The Cougar Chronicle'
                  : 'Donation to The Cougar Chronicle',
                description: isAugustFundraiser
                  ? 'August / America 250 drive. $48+ = Founding Member for one year when matched to your account email.'
                  : 'Support independent conservative journalism.',
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}${successPath}`,
        cancel_url: `${origin}${cancelPath}`,
        metadata: {
          type: 'donation',
          campaign: campaign || 'general',
          userId: session?.user?.id || '',
        },
      });
    } else if (type === 'digital_article') {
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
              unit_amount: 199,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/api/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/premium-article/${metadata.slug}`,
        metadata: {
          type: 'digital_article',
          postId: metadata.postId,
          slug: metadata.slug,
        },
      });
    } else if (type === 'digital_print') {
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
              unit_amount: 1000,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/print-edition?success=digital&purchase=10.00`,
        cancel_url: `${origin}/print-edition`,
        metadata: {
          type: 'digital_print',
          printEditionId: metadata?.printEditionId || '',
        },
      });
    } else if (type === 'physical_print') {
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
              unit_amount: 1500,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/print-edition?success=physical&purchase=15.00`,
        cancel_url: `${origin}/print-edition`,
        metadata: {
          type: 'physical_print',
          printEditionId: metadata?.printEditionId || '',
        },
      });
    } else if (type === 'subscription') {
      if (!session?.user) {
        if (contentType.includes('application/json')) {
          return NextResponse.json({ error: 'Login required' }, { status: 401 });
        }
        return NextResponse.redirect(`${origin}/login?callbackUrl=/membership`, 303);
      }

      const membershipPriceId =
        priceId || process.env.STRIPE_MEMBERSHIP_PRICE_ID || '';

      if (!membershipPriceId) {
        return NextResponse.json(
          { error: 'Membership price not configured' },
          { status: 500 }
        );
      }

      const createParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: membershipPriceId, quantity: 1 }],
        success_url: `${origin}/membership?success=true`,
        cancel_url: `${origin}/membership`,
        client_reference_id: session.user.id,
        metadata: { userId: session.user.id, type: 'subscription' },
        subscription_data: {
          metadata: { userId: session.user.id, type: 'subscription' },
        },
      };

      if (session.user.email) {
        // Prefer existing Stripe customer if we have stripeId
        const prisma = (await import('@/lib/prisma')).default;
        const dbUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { stripeId: true },
        });
        if (dbUser?.stripeId) {
          createParams.customer = dbUser.stripeId;
        } else {
          createParams.customer_email = session.user.email;
        }
      }

      checkoutSession = await stripe.checkout.sessions.create(createParams);
    }

    if (contentType.includes('application/json')) {
      return NextResponse.json({ url: checkoutSession?.url });
    }
    if (checkoutSession?.url) {
      return NextResponse.redirect(checkoutSession.url, 303);
    }
    return new NextResponse('Checkout Session Failed', { status: 500 });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

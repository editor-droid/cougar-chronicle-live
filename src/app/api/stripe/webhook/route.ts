import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_fallback_so_build_does_not_crash';
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16' as any,
  });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const { type, userId, postId } = session.metadata || {};
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;

    if (type === 'subscription' && userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isSubscribed: true,
          membershipExpiresAt: null, // ongoing Stripe subscription
          stripeId: (session.customer as string) || undefined,
          giftLinks: { increment: 3 },
        },
      });
    } else if (type === 'donation') {
      const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
      const campaign = session.metadata?.campaign || 'general';
      const donorUserId = session.metadata?.userId || '';

      if (customerEmail) {
        await prisma.donation.create({
          data: {
            email: customerEmail,
            name: customerName,
            amount: amountTotal,
            stripeSessionId: session.id,
          },
        });
      }

      // August fundraiser only: $25+ from /fundraiser = America 250 Founding Member (1 year)
      // (metadata.campaign must be august_fundraiser — regular /donate never sets this)
      const {
        grantYearMembership,
        isAugustFundraiserWindow,
        AUGUST_FOUNDING_MEMBER_MIN,
      } = await import('@/lib/membership');
      if (
        campaign === 'august_fundraiser' &&
        amountTotal >= AUGUST_FOUNDING_MEMBER_MIN &&
        isAugustFundraiserWindow()
      ) {
        const result = await grantYearMembership({
          userId: donorUserId || undefined,
          email: customerEmail,
          giftLinks: 3,
        });

        if (result.granted) {
          console.log(
            `[AUGUST_FUNDRAISER] Founding membership granted to user ${result.userId} ($${amountTotal})`
          );
        } else if (customerEmail && process.env.RESEND_API_KEY) {
          try {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            const origin = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';
            await resend.emails.send({
              from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
              to: customerEmail,
              subject: 'Claim your America 250 Founding Membership',
              html: `<p>Thank you for giving $${amountTotal.toFixed(0)} to our August Fundraising Drive!</p>
                <p>Gifts of <strong>$${AUGUST_FOUNDING_MEMBER_MIN}+</strong> from this campaign include a year as an
                <strong>America 250 Founding Member</strong> — all premium digital stories, annual Print Volume PDF, and gift unlocks.</p>
                <p>Create an account with <strong>this same email</strong> (${customerEmail}) so we can activate it:</p>
                <p><a href="${origin}/register">Create your account</a> · then visit <a href="${origin}/account">My Account</a>.</p>
                <p>If you already have an account under a different email, reply to this message and we’ll link it.</p>`,
            });
          } catch (e) {
            console.error('August membership claim email failed', e);
          }
        }
      }
    } else if (type === 'physical_print' || type === 'digital_print') {
      const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
      const printEditionId = session.metadata?.printEditionId || null;
      const shipping = (session as any).shipping_details
        ? JSON.stringify((session as any).shipping_details)
        : session.customer_details?.address
          ? JSON.stringify(session.customer_details)
          : null;

      if (customerEmail) {
        await prisma.printPurchase.create({
          data: {
            email: customerEmail,
            name: customerName,
            type: type === 'physical_print' ? 'physical' : 'digital',
            amount: amountTotal,
            stripeSessionId: session.id,
            printEditionId: printEditionId || null,
            shippingJson: shipping,
            fulfilled: type === 'digital_print',
          },
        });
      }

      if (type === 'digital_print' && customerEmail && printEditionId) {
        const edition = await prisma.printEdition.findUnique({
          where: { id: printEditionId },
        });
        if (edition?.pdfUrl) {
          try {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
              to: customerEmail,
              subject: `Your Digital Print Edition: ${edition.title}`,
              html: `<p>Thank you for purchasing the digital print edition!</p><p><a href="${edition.pdfUrl}">Download your PDF</a></p>`,
            });
          } catch (e) {
            console.error('Digital print email failed', e);
          }
        }
      }

      if (type === 'physical_print' && customerEmail) {
        try {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
            to: customerEmail,
            subject: 'We received your Print Volume order',
            html: `<p>Thanks for ordering a physical Print Volume from The Cougar Chronicle.</p><p>We'll fulfill your order and email when it ships. Questions? Reply to this message or contact us on the site.</p>`,
          });
        } catch (e) {
          console.error('Physical print confirm email failed', e);
        }
      }
    } else if (type === 'digital_article' && postId) {
      if (customerEmail) {
        const crypto = require('crypto');
        const secureToken = crypto.randomBytes(32).toString('hex');

        await prisma.articleToken.create({
          data: {
            token: secureToken,
            email: customerEmail,
            postId: postId,
          },
        });

        const articleLink = `${process.env.NEXTAUTH_URL}/api/verify-token?token=${secureToken}`;
        try {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
            to: customerEmail,
            subject: 'Here is your premium article',
            html: `<p>Thank you for purchasing this article!</p><p><a href="${articleLink}">Read your article</a></p>`,
          });
        } catch (e) {
          console.error('Article purchase email failed', e);
        }
      }
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any;
    if (invoice.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const customerId = subscription.customer as string;
        await prisma.user.updateMany({
          where: { stripeId: customerId },
          data: { isSubscribed: true },
        });
      } catch (e) {
        console.error('invoice.payment_succeeded handler', e);
      }
    }
  }

  if (
    event.type === 'customer.subscription.deleted' ||
    event.type === 'customer.subscription.updated'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const active =
      subscription.status === 'active' || subscription.status === 'trialing';

    await prisma.user.updateMany({
      where: { stripeId: customerId },
      data: { isSubscribed: active },
    });
  }

  return new NextResponse('OK', { status: 200 });
}

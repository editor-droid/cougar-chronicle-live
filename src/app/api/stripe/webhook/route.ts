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

      // August fundraiser only: $48+ from /fundraiser = membership perks (1 year).
      // $25 is a named “Patriot” gift only (no unlock). Regular /donate never sets this campaign.
      const { grantYearMembership, isAugustFundraiserWindow } = await import(
        '@/lib/membership'
      );
      const { AUGUST_MEMBERSHIP_MIN } = await import('@/lib/membership-constants');
      if (
        campaign === 'august_fundraiser' &&
        amountTotal >= AUGUST_MEMBERSHIP_MIN &&
        isAugustFundraiserWindow() &&
        customerEmail
      ) {
        // Always grant after purchase: match existing account or create one for their Stripe email
        const result = await grantYearMembership({
          userId: donorUserId || undefined,
          email: customerEmail,
          name: customerName,
          giftLinks: 3,
          createIfMissing: true,
        });

        if (result.granted && process.env.RESEND_API_KEY) {
          try {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            const origin = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';
            const expires = new Date();
            expires.setFullYear(expires.getFullYear() + 1);

            await resend.emails.send({
              from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
              to: customerEmail,
              subject: 'You’re an America 250 Founding Member — thank you!',
              html: `
                <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1A1A1A;">
                  <p>Thank you for giving <strong>$${amountTotal.toFixed(0)}</strong> to our August Fundraising Drive.</p>
                  <p>You’re now an <strong>America 250 Founding Member</strong> for one year
                  (through about ${expires.toLocaleDateString()}):</p>
                  <ul>
                    <li>All premium digital stories</li>
                    <li>Annual Print Volume PDF when it launches</li>
                    <li>3 gift unlocks for friends</li>
                  </ul>
                  ${
                    result.createdUser
                      ? `<p>We created an account for <strong>${customerEmail}</strong>. To sign in:</p>
                         <p><a href="${origin}/forgot-password">Set a password</a>
                         or use <a href="${origin}/login">Google login</a> with this same email,
                         then open <a href="${origin}/account">My Account</a>.</p>`
                      : `<p>Sign in at <a href="${origin}/login">${origin}/login</a> with this email,
                         then visit <a href="${origin}/account">My Account</a> for your membership and gifts.</p>`
                  }
                  <p style="color:#6B7280;font-size:14px;">Questions? Reply to this email or use our contact page.</p>
                </div>`,
            });
          } catch (e) {
            console.error('August membership welcome email failed', e);
          }
        }
        console.log(
          `[AUGUST_FUNDRAISER] Membership granted user=${result.userId} created=${result.createdUser} amount=$${amountTotal}`
        );
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

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const { type, userId, postId, slug } = session.metadata || {};
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name;

    if (type === 'subscription' && userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          isSubscribed: true,
          stripeId: session.customer as string,
          giftLinks: { increment: 3 }
        }
      });
    } 
    else if (type === 'donation') {
      // Send a thank you email for their donation
      if (customerEmail) {
        // You would add Resend logic here to email the donor
        console.log(`Donation received from ${customerEmail}`);
      }
    }
    else if (type === 'physical_print') {
      // Notify fulfillment team
      console.log(`Physical Print Edition ordered by ${customerEmail}`);
    }
    else if (type === 'digital_print') {
      if (customerEmail && session.metadata?.printEditionId) {
        const edition = await prisma.printEdition.findUnique({
          where: { id: session.metadata.printEditionId }
        });
        
        if (edition && edition.pdfUrl) {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          
          await resend.emails.send({
            from: 'The Cougar Chronicle <noreply@cougarchronicle.com>',
            to: customerEmail,
            subject: `Your Digital Print Edition: ${edition.title}`,
            html: `<p>Thank you for purchasing the digital print edition!</p><p>You can download your PDF replica here:</p><br/><a href="${edition.pdfUrl}">${edition.pdfUrl}</a>`
          });
          console.log(`Emailed Digital Print PDF to ${customerEmail}`);
        }
      }
    }
    else if (type === 'digital_article' && postId) {
      // Generate a secure access token for this article
      if (customerEmail) {
        const crypto = require('crypto');
        const secureToken = crypto.randomBytes(32).toString('hex');
        
        await prisma.articleToken.create({
          data: {
            token: secureToken,
            email: customerEmail,
            postId: postId
          }
        });

        const articleLink = `${process.env.NEXTAUTH_URL}/api/verify-token?token=${secureToken}`;
        
        // Use Resend to email them the secure link
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: 'The Cougar Chronicle <noreply@cougarchronicle.com>',
          to: customerEmail,
          subject: 'Here is your premium article',
          html: `<p>Thank you for purchasing this article! You can view the full, ad-free article anytime by clicking your private link below:</p><br/><a href="${articleLink}">${articleLink}</a>`
        });
      }
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as any;
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    await prisma.user.update({
      where: { stripeId: subscription.customer as string },
      data: { isSubscribed: true, giftLinks: { increment: 3 } }
    });
  }

  return new NextResponse('OK', { status: 200 });
}

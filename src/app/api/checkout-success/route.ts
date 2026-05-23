import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'sk_test_fallback') as string, {
  apiVersion: '2023-10-16' as any,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid' && session.metadata?.type === 'digital_article') {
      const email = session.customer_details?.email;
      const postId = session.metadata.postId;
      const slug = session.metadata.slug;

      if (email && postId) {
        // Find existing token or create a new one
        let articleToken = await prisma.articleToken.findFirst({
          where: { email, postId }
        });

        if (!articleToken) {
          const secureToken = crypto.randomBytes(32).toString('hex');
          articleToken = await prisma.articleToken.create({
            data: {
              token: secureToken,
              email: email,
              postId: postId
            }
          });
        }

        // Set the secure cookie
        const cookieStore = await cookies();
        cookieStore.set(`article_token_${postId}`, articleToken.token, { 
          maxAge: 60 * 60 * 24 * 365, // 1 year
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          path: '/'
        });

        return NextResponse.redirect(new URL(`/premium-article/${slug}`, request.url));
      }
    }

    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Error handling checkout success redirect:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}

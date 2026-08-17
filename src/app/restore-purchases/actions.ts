'use server';

import prisma from '@/lib/prisma';
import { Resend } from 'resend';

export async function restorePurchases(email: string) {
  try {
    if (!email || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }

    const tokens = await prisma.articleToken.findMany({
      where: { email },
      include: { post: true }
    });

    if (tokens.length === 0) {
      return { error: 'We could not find any purchases associated with that email address.' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    let linksHtml = tokens.map(t => {
      const link = `${process.env.NEXTAUTH_URL}/premium-article/${t.post.slug}?token=${t.token}`;
      return `<li><strong>${t.post.title}:</strong> <br/><a href="${link}">${link}</a></li>`;
    }).join('<br/>');

    await resend.emails.send({
      from: 'The Cougar Chronicle <newsletter@updates.thecougarchronicle.com>',
      to: email,
      subject: 'Your Premium Article Access Links',
      html: `
        <h2>Purchase History</h2>
        <p>Here are your secure access links to the premium articles you have purchased:</p>
        <ul>${linksHtml}</ul>
        <p>Save this email for your records!</p>
      `
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to restore purchases', err);
    return { error: 'An unexpected error occurred. Please try again later.' };
  }
}

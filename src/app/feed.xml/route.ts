import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import RSS from 'rss';

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';

  const feed = new RSS({
    title: 'The Cougar Chronicle',
    description: 'Independent, conservative student journalism at Brigham Young University.',
    feed_url: `${baseUrl}/feed.xml`,
    site_url: baseUrl,
    image_url: `${baseUrl}/images/logo.png`,
    language: 'en',
    pubDate: new Date().toUTCString(),
  });

  const posts = await prisma.post.findMany({
    where: { state: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      author: true
    }
  });

  posts.forEach((post) => {
    const url = post.printEditionId 
      ? `${baseUrl}/print-edition/${post.slug}` 
      : `${baseUrl}/article/${post.slug}`;
      
    // Create a plain text summary from the HTML content
    const summary = post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...' : '';

    feed.item({
      title: post.title,
      description: summary,
      url: url,
      guid: post.id,
      categories: [post.category],
      author: post.author?.name || 'Cougar Chronicle Staff',
      date: post.createdAt,
    });
  });

  return new NextResponse(feed.xml({ indent: true }), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

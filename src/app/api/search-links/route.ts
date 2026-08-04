import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const query = q.replace(/^\//, ''); // remove leading slash for searching
  
  // Return some static pages
  const staticPages = [
    { title: 'Home', url: '/' },
    { title: 'About Us', url: '/about' },
    { title: 'Contact', url: '/contact' },
    { title: 'Apply to Join', url: '/recruiting' },
    { title: 'Staff Directory', url: '/staff' },
  ].filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.url.toLowerCase().includes(query.toLowerCase()));

  // Search articles
  const posts = await prisma.post.findMany({
    where: {
      state: 'PUBLISHED',
      title: { contains: query, mode: 'insensitive' }
    },
    select: { title: true, slug: true },
    take: 5
  });

  const articleLinks = posts.map(a => ({
    title: a.title,
    url: `/${a.slug}`
  }));

  return NextResponse.json([...staticPages, ...articleLinks].slice(0, 8));
}

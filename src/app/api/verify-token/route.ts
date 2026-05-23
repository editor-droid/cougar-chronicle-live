import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const validToken = await prisma.articleToken.findUnique({
    where: { token },
    include: { post: true }
  });

  if (!validToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set(`article_token_${validToken.postId}`, token, { 
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });

  return NextResponse.redirect(new URL(`/premium-article/${validToken.post.slug}`, request.url));
}

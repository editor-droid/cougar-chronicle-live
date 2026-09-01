import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { authConfig } from '@/auth.config';

const authMiddleware = NextAuth(authConfig).auth;

/** Legacy R2 public host → custom CDN (pub-*.r2.dev is off in production). */
const LEGACY_R2 = /https?:\/\/pub-[a-f0-9]+\.r2\.dev/i;
const CDN_BASE = (
  process.env.CLOUDFLARE_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL ||
  'https://cdn.thecougarchronicle.com'
).replace(/\/$/, '');

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  // Next/Image optimizer: rewrite source so fetches hit cdn, not disabled r2.dev
  if (req.nextUrl.pathname === '/_next/image') {
    const raw = req.nextUrl.searchParams.get('url');
    if (raw && LEGACY_R2.test(raw)) {
      const rewritten = raw.replace(LEGACY_R2, CDN_BASE);
      const next = req.nextUrl.clone();
      next.searchParams.set('url', rewritten);
      return NextResponse.rewrite(next);
    }
    return NextResponse.next();
  }

  // @ts-expect-error NextAuth middleware typing
  return authMiddleware(req, event);
}

export const config = {
  matcher: [
    // Staff/auth only — public HTML must not get NextAuth CSRF cookies
    '/dashboard',
    '/dashboard/:path*',
    '/login',
    '/account',
    '/account/:path*',
    '/restore-purchases',
    // Image optimizer so we can swap r2.dev → cdn (no auth)
    '/_next/image',
  ],
};

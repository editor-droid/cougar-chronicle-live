import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';
import { canAccessDashboard } from '@/lib/roles';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith('/dashboard');
      
      if (isDashboard) {
        if (!isLoggedIn) return false; // Redirect unauthenticated users to login page
        // Layouts do not re-run on client navigations (Next.js partial rendering),
        // so the staff check also lives here, on every dashboard request.
        if (canAccessDashboard(auth?.user?.role)) return true;
        return NextResponse.redirect(new URL('/account', nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  providers: [], // Add providers with an empty array for now to satisfy NextAuthConfig
} satisfies NextAuthConfig;

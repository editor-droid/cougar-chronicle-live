import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
      // Kept. Google checks the email address, and this site already has
      // credential readers, Stripe membership rows, and staff accounts on the
      // same email. Without this flag, "Sign in with Google" fails with
      // OAuthAccountNotLinked for anyone who already has a user row and has
      // not linked Google. Public registration also does not set emailVerified,
      // so Auth.js will not link those accounts on its own.
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const ip = getClientIp(request);
        const byAccount = rateLimit(`cred:${ip}:${email}`, 20, 15 * 60 * 1000);
        const byIp = rateLimit(`cred-ip:${ip}`, 60, 15 * 60 * 1000);
        if (!byAccount.success || !byIp.success) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });
        
        if (!user || !user.password) return null;
        
        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordsMatch) return null;
        // Archived staff and readers cannot use password login.
        // Length is not checked here so existing shorter passwords still work.
        if (user.archivedAt) return null;

        return user;
      }
    })
  ],
});

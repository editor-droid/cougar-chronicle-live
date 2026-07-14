import prisma from '@/lib/prisma';

/** True if user has active paid/campaign membership. */
export async function userHasActiveMembership(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSubscribed: true, membershipExpiresAt: true, role: true },
  });
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'EDITOR') return true;
  if (!user.isSubscribed) return false;
  if (user.membershipExpiresAt && user.membershipExpiresAt < new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: { isSubscribed: false },
    });
    return false;
  }
  return true;
}

/** Grant one year of membership (August fundraiser path, etc.). */
export async function grantYearMembership(opts: {
  userId?: string;
  email?: string | null;
  name?: string | null;
  giftLinks?: number;
  /** If no account exists, create one (no password — set via forgot-password / Google). */
  createIfMissing?: boolean;
}): Promise<{ granted: boolean; userId?: string; createdUser?: boolean }> {
  const giftLinks = opts.giftLinks ?? 3;
  let user =
    opts.userId
      ? await prisma.user.findUnique({ where: { id: opts.userId } })
      : null;

  if (!user && opts.email) {
    user = await prisma.user.findFirst({
      where: { email: { equals: opts.email, mode: 'insensitive' } },
    });
  }

  let createdUser = false;
  if (!user && opts.createIfMissing && opts.email) {
    const email = opts.email.trim().toLowerCase();
    user = await prisma.user.create({
      data: {
        email,
        name: opts.name?.trim() || email.split('@')[0] || 'Member',
        role: 'USER',
        password: null,
      },
    });
    createdUser = true;
  }

  if (!user) {
    return { granted: false };
  }

  // Already on open-ended Stripe membership — just top up gifts
  if (user.isSubscribed && !user.membershipExpiresAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: { giftLinks: { increment: giftLinks } },
    });
    return { granted: true, userId: user.id, createdUser };
  }

  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  // Don't shorten an existing longer campaign membership
  const nextExpires =
    user.membershipExpiresAt && user.membershipExpiresAt > expires
      ? user.membershipExpiresAt
      : expires;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isSubscribed: true,
      membershipExpiresAt: nextExpires,
      giftLinks: createdUser ? giftLinks : { increment: giftLinks },
    },
  });

  return { granted: true, userId: user.id, createdUser };
}

/** Calendar August (any year) — campaign window for fundraiser membership perk. */
export function isAugustFundraiserWindow(date = new Date()): boolean {
  return date.getMonth() === 7; // 0-indexed: August = 7
}

// AUGUST_FOUNDING_MEMBER_MIN lives in membership-constants.ts (safe for client components)

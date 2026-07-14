import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { grantYearMembership, isAugustFundraiserWindow } from '@/lib/membership';

/**
 * After register/login: if this email gave $48+ via August fundraiser
 * and doesn't have membership yet, grant one year.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSubscribed: true, membershipExpiresAt: true },
  });

  if (
    user?.isSubscribed &&
    (!user.membershipExpiresAt || user.membershipExpiresAt > new Date())
  ) {
    return NextResponse.json({ granted: false, reason: 'already_member' });
  }

  // Qualifying August fundraiser donations for this email (any year while campaign ran;
  // window check is on donation create; here we trust recorded gifts of $48+)
  const since = new Date();
  since.setMonth(0, 1); // this calendar year
  since.setHours(0, 0, 0, 0);

  const gifts = await prisma.donation.findMany({
    where: {
      email: { equals: session.user.email, mode: 'insensitive' },
      amount: { gte: 48 },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Prefer gifts in August of current year
  const augustGift = gifts.find((d) => d.createdAt.getMonth() === 7);
  if (!augustGift && !isAugustFundraiserWindow()) {
    return NextResponse.json({ granted: false, reason: 'no_qualifying_gift' });
  }
  if (!augustGift && gifts.length === 0) {
    return NextResponse.json({ granted: false, reason: 'no_qualifying_gift' });
  }

  const result = await grantYearMembership({
    userId: session.user.id,
    giftLinks: 3,
  });

  return NextResponse.json({ granted: result.granted });
}

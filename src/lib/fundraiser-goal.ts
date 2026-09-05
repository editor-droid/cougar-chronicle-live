import prisma from '@/lib/prisma';
import {
  DEFAULT_FUNDRAISER_GOAL,
  FUNDRAISER_GOAL_KEY,
  parseGoalDollars,
} from '@/lib/donations';

export async function getFundraiserGoal(): Promise<number> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: FUNDRAISER_GOAL_KEY },
  });
  return parseGoalDollars(row?.value) ?? DEFAULT_FUNDRAISER_GOAL;
}

export async function setFundraiserGoal(goal: number): Promise<number> {
  const value = String(goal);
  await prisma.siteSetting.upsert({
    where: { key: FUNDRAISER_GOAL_KEY },
    update: { value },
    create: { key: FUNDRAISER_GOAL_KEY, value },
  });
  return goal;
}

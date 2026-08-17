import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import DashboardHeader from '@/components/DashboardHeader';
import SubscribersManager from './SubscribersManager';

export default async function SubscribersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/dashboard');

  const subscribers = await prisma.subscriber.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="subscribers" title="Email subscribers" />
      <SubscribersManager
        initial={subscribers.map((s) => ({
          id: s.id,
          email: s.email,
          isActive: s.isActive,
          wantsNews: s.wantsNews,
          wantsCampus: s.wantsCampus,
          wantsPolitics: s.wantsPolitics,
          wantsFaith: s.wantsFaith,
          wantsOpinion: s.wantsOpinion,
          wantsVideos: s.wantsVideos,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import { getPublicTeam } from '@/lib/site-content';
import TeamRosterManager from './TeamRosterManager';

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const team = await getPublicTeam();

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="team" title="Team roster" />
      <TeamRosterManager initialTeam={team} />
    </div>
  );
}

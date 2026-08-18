import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import { getOpenRoles, getPublicTeam } from '@/lib/site-content';
import { getStaffOrganizerData } from '@/lib/staff-organizer';
import TeamAdmin from './TeamAdmin';

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const [team, openRoles, organizer] = await Promise.all([
    getPublicTeam(),
    getOpenRoles(),
    getStaffOrganizerData(),
  ]);

  return (
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="team" title="Team" />
      <TeamAdmin
        team={team}
        openRoles={openRoles}
        organizerRows={organizer.rows}
        organizerUsers={organizer.users}
        organizerSummary={organizer.summary}
      />
    </div>
  );
}

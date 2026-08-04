import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import { getMediaAppearances } from '@/lib/site-content';
import MediaAppearancesManager from '../media/MediaAppearancesManager';

export default async function AppearancesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const appearances = await getMediaAppearances();

  return (
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="appearances" title="Appearances" />
      <MediaAppearancesManager initialAppearances={appearances} />
    </div>
  );
}

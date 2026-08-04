import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import LinksManager from './LinksManager';

export default async function DashboardLinksPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR') {
    redirect('/dashboard');
  }

  return (
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="links" title="Link Hub" />
      <LinksManager />
    </div>
  );
}

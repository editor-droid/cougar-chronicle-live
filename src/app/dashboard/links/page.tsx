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
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '4rem' }}>
      <DashboardHeader currentTab="links" title="Link Hub" />
      <p className="font-sans text-muted" style={{ margin: '0 0 1.5rem', maxWidth: 560 }}>
        Branded Linktree for Instagram bios and social profiles. Images stay off unless you enable them;
        auto-thumbnail pulls the page&apos;s preview image into R2.
      </p>
      <LinksManager />
    </div>
  );
}

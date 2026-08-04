import { auth, signOut } from '@/auth';
import Link from 'next/link';
import DashboardNav from '@/components/DashboardNav';

export default async function DashboardHeader({
  currentTab,
  title,
}: {
  currentTab:
    | 'posts'
    | 'users'
    | 'print-editions'
    | 'donors'
    | 'subscribers'
    | 'videos'
    | 'links'
    | 'team'
    | 'media'
    | 'appearances'
    | 'team-media'
    | 'analytics';
  title?: string;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const role = session.user.role;
  const isEditorOrAdmin = role === 'EDITOR' || role === 'ADMIN';

  return (
    <header className="dash-header">
      <div className="dash-header-top">
        <h1 className="dash-header-title">
          {title || (isEditorOrAdmin ? 'Editorial Dashboard' : 'Writer Dashboard')}
        </h1>
        <div className="dash-header-actions">
          <Link
            href="/dashboard/editor/new"
            className="btn btn-primary font-sans"
            style={{ padding: '0.5rem 1rem' }}
          >
            New Draft
          </Link>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="btn btn-secondary font-sans"
              style={{ padding: '0.5rem 1rem' }}
            >
              Logout
            </button>
          </form>
        </div>
      </div>

      <DashboardNav
        currentTab={currentTab}
        role={role}
        isEditorOrAdmin={isEditorOrAdmin}
      />

      <span className="dash-user">
        {session.user.name || session.user.email} · {role}
      </span>
    </header>
  );
}

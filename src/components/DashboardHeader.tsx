import { auth, signOut } from '@/auth';
import Link from 'next/link';

export default async function DashboardHeader({ 
  currentTab,
  title
}: { 
  currentTab: 'posts' | 'users' | 'print-editions',
  title?: string
}) {
  const session = await auth();
  if (!session?.user) return null;
  
  const role = session.user.role;
  const isEditorOrAdmin = role === 'EDITOR' || role === 'ADMIN';

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2rem', flexWrap: 'wrap' }}>
        <h1 className="font-serif" style={{ fontSize: '2.5rem' }}>
          {title || (isEditorOrAdmin ? 'Editorial Dashboard' : 'Writer Dashboard')}
        </h1>
        {isEditorOrAdmin && (
          <nav style={{ display: 'flex', gap: '1rem' }}>
            {currentTab === 'posts' ? (
              <span className="font-sans" style={{ fontWeight: 600, borderBottom: '2px solid var(--foreground)' }}>Posts</span>
            ) : (
              <Link href="/dashboard" className="text-muted hover:text-foreground font-sans">Posts</Link>
            )}
            
            {role === 'ADMIN' && (
              currentTab === 'users' ? (
                <span className="font-sans" style={{ fontWeight: 600, borderBottom: '2px solid var(--foreground)' }}>Users</span>
              ) : (
                <Link href="/dashboard/users" className="text-muted hover:text-foreground font-sans">Users</Link>
              )
            )}
            
            {currentTab === 'print-editions' ? (
              <span className="font-sans" style={{ fontWeight: 600, borderBottom: '2px solid var(--foreground)' }}>Print Editions</span>
            ) : (
              <Link href="/dashboard/print-editions" className="text-muted hover:text-foreground font-sans">Print Editions</Link>
            )}
          </nav>
        )}
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span className="text-muted font-sans text-sm" style={{ alignSelf: 'center' }}>
          Logged in as {session.user.name || session.user.email} ({role})
        </span>
        <Link href="/dashboard/editor/new" className="btn btn-primary font-sans" style={{ padding: '0.5rem 1rem' }}>New Draft</Link>
        <form action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}>
          <button type="submit" className="btn btn-secondary font-sans" style={{ padding: '0.5rem 1rem' }}>Logout</button>
        </form>
      </div>
    </header>
  );
}

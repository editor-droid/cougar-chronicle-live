import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { canAccessDashboard } from '@/lib/roles';
import './dashboard.css';

export const metadata: Metadata = {
  manifest: '/api/manifest/admin',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  // New dashboard pages inherit this check. Per-page checks stay in place.
  if (!canAccessDashboard(session.user.role)) redirect('/account');
  return <div className="dashboard-shell">{children}</div>;
}

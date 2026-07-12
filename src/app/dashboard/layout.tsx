import { Metadata } from 'next';
import './dashboard.css';

export const metadata: Metadata = {
  manifest: '/api/manifest/admin',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dashboard-shell">{children}</div>;
}

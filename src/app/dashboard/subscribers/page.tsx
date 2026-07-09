import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import DashboardHeader from '@/components/DashboardHeader';

export default async function SubscribersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/dashboard');

  const subscribers = await prisma.subscriber.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <DashboardHeader currentTab="subscribers" title="Email Subscribers" />

      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">DATE SUBSCRIBED</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">EMAIL</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">NEWS</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">FAITH</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">OPINION</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }} className="font-sans text-muted">No subscribers yet.</td>
              </tr>
            ) : (
              subscribers.map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)', opacity: sub.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: '1rem' }} className="font-sans text-sm">{new Date(sub.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }} className="font-sans font-bold">{sub.email}</td>
                  <td style={{ padding: '1rem' }} className="font-sans text-center">{sub.wantsNews ? '✓' : '-'}</td>
                  <td style={{ padding: '1rem' }} className="font-sans text-center">{sub.wantsFaith ? '✓' : '-'}</td>
                  <td style={{ padding: '1rem' }} className="font-sans text-center">{sub.wantsOpinion ? '✓' : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

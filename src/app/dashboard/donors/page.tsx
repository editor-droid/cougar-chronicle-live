import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import DashboardHeader from '@/components/DashboardHeader';
import { updateFundraiserGoal } from './actions';
import ManualDonationForm from './ManualDonationForm';

export default async function DonorsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/dashboard');

  const donations = await prisma.donation.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);

  const goalSetting = await prisma.siteSetting.findUnique({
    where: { key: 'fundraiserGoal' },
  });

  const goal = goalSetting ? parseInt(goalSetting.value, 10) : 8000;
  const pct = Math.min(100, (totalRaised / Math.max(goal, 1)) * 100);

  return (
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="donors" title="Donors" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div className="dash-card" style={{ padding: '1.25rem 1.35rem' }}>
          <p className="font-sans" style={{ margin: '0 0 0.35rem', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280' }}>
            Fundraiser
          </p>
          <h2 className="font-serif" style={{ fontSize: '1.35rem', margin: '0 0 1rem', color: '#1B2253' }}>
            Status
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="font-sans text-muted" style={{ fontSize: '0.9rem' }}>
              Raised: <strong style={{ color: 'var(--foreground)' }}>${totalRaised.toLocaleString()}</strong>
            </span>
            <span className="font-sans text-muted" style={{ fontSize: '0.9rem' }}>
              Goal: ${goal.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '0.65rem',
              backgroundColor: '#eef0f6',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #1B2253, #3d4a8c)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        <div className="dash-card" style={{ padding: '1.25rem 1.35rem' }}>
          <p className="font-sans" style={{ margin: '0 0 0.35rem', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280' }}>
            Settings
          </p>
          <h2 className="font-serif" style={{ fontSize: '1.35rem', margin: '0 0 1rem', color: '#1B2253' }}>
            Goal
          </h2>
          <form action={updateFundraiserGoal} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="font-sans text-sm text-muted">Fundraiser goal ($)</label>
            <input
              type="number"
              name="goal"
              defaultValue={goal}
              className="font-sans"
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                borderRadius: '0.65rem',
                border: '1px solid #e8eaf0',
                background: 'var(--surface-hover)',
              }}
            />
            <button type="submit" className="dash-btn dash-btn-primary" style={{ alignSelf: 'flex-start' }}>
              Update goal
            </button>
          </form>
        </div>
      </div>

      <ManualDonationForm />

      <div className="dash-card" style={{ marginTop: '1.25rem' }}>
        <div className="dash-card-header">
          <h2 className="dash-section-title">Donations</h2>
          <span className="dash-badge dash-badge-navy">{donations.length}</span>
        </div>
        <div className="dashboard-table-scroll">
          {donations.length === 0 ? (
            <div className="dash-empty">No donations yet.</div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Donor</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((donation) => (
                  <tr key={donation.id}>
                    <td className="text-muted">
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </td>
                    <td>{donation.name || 'Anonymous'}</td>
                    <td className="text-muted">{donation.email}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#1B2253' }}>
                      ${donation.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

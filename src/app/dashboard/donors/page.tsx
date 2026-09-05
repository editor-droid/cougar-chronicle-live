import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import DashboardHeader from '@/components/DashboardHeader';
import ManualDonationForm from './ManualDonationForm';
import GoalForm from './GoalForm';
import {
  campaignLabel,
  DONATION_CAMPAIGN,
  sourceLabel,
} from '@/lib/donations';
import { getFundraiserGoal } from '@/lib/fundraiser-goal';

export const dynamic = 'force-dynamic';

export default async function DonorsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/dashboard');

  const donations = await prisma.donation.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const totalAll = donations.reduce((sum, d) => sum + d.amount, 0);
  const fundraiserRaised = donations
    .filter((d) => d.campaign === DONATION_CAMPAIGN.AUGUST_FUNDRAISER)
    .reduce((sum, d) => sum + d.amount, 0);
  const generalRaised = donations
    .filter((d) => d.campaign === DONATION_CAMPAIGN.GENERAL)
    .reduce((sum, d) => sum + d.amount, 0);

  const goal = await getFundraiserGoal();
  const pct = Math.min(100, (fundraiserRaised / Math.max(goal, 1)) * 100);

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
          <p
            className="font-sans"
            style={{
              margin: '0 0 0.35rem',
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6b7280',
            }}
          >
            Fundraiser
          </p>
          <h2 className="font-serif" style={{ fontSize: '1.35rem', margin: '0 0 1rem', color: '#1B2253' }}>
            Fall drive
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="font-sans text-muted" style={{ fontSize: '0.9rem' }}>
              Raised:{' '}
              <strong style={{ color: 'var(--foreground)' }}>
                ${fundraiserRaised.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </strong>
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
          <p className="font-sans text-muted" style={{ fontSize: '0.8rem', margin: '0.75rem 0 0' }}>
            All-time gifts: ${totalAll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            {' · '}
            General: ${generalRaised.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="dash-card" style={{ padding: '1.25rem 1.35rem' }}>
          <p
            className="font-sans"
            style={{
              margin: '0 0 0.35rem',
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6b7280',
            }}
          >
            Settings
          </p>
          <h2 className="font-serif" style={{ fontSize: '1.35rem', margin: '0 0 1rem', color: '#1B2253' }}>
            Goal
          </h2>
          <GoalForm currentGoal={goal} />
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
                  <th>Campaign</th>
                  <th>Source</th>
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
                    <td className="text-muted">{campaignLabel(donation.campaign)}</td>
                    <td className="text-muted">
                      {sourceLabel(donation.source)}
                      {donation.sourceDetail ? (
                        <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.85 }}>
                          {donation.sourceDetail}
                        </span>
                      ) : null}
                    </td>
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

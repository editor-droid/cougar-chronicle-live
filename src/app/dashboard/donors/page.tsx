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
    orderBy: { createdAt: 'desc' }
  });
  
  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);

  const goalSetting = await prisma.siteSetting.findUnique({
    where: { key: 'fundraiserGoal' }
  });
  
  const goal = goalSetting ? parseInt(goalSetting.value, 10) : 8000;

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <DashboardHeader currentTab="donors" title="Donor Management" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Fundraiser status</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="font-sans text-muted">Raised: ${totalRaised.toLocaleString()}</span>
            <span className="font-sans text-muted">Goal: ${goal.toLocaleString()}</span>
          </div>
          
          <div style={{ width: '100%', height: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ width: `${Math.min(100, (totalRaised / Math.max(goal, 1)) * 100)}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 0.5s ease-in-out' }} />
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
          <h2 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Goal settings</h2>
          <form action={updateFundraiserGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Fundraiser Goal ($)</label>
              <input type="number" name="goal" defaultValue={goal} className="font-sans" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }} />
            </div>
            <button type="submit" className="btn btn-primary font-sans" style={{ padding: '0.5rem' }}>Update Goal</button>
          </form>
        </div>
      </div>

      <ManualDonationForm />

      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">DATE</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">DONOR</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">EMAIL</th>
              <th style={{ padding: '1rem', textAlign: 'right' }} className="font-sans text-sm text-muted">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }} className="font-sans text-muted">No donations yet.</td>
              </tr>
            ) : (
              donations.map((donation) => (
                <tr key={donation.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }} className="font-sans text-sm">{new Date(donation.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }} className="font-sans">{donation.name || 'Anonymous'}</td>
                  <td style={{ padding: '1rem' }} className="font-sans text-muted">{donation.email}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }} className="font-sans text-accent">
                    ${donation.amount.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

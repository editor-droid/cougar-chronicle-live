import prisma from '@/lib/prisma';
import DonateForm from './DonateForm';

export default async function DonatePage() {
  // Fetch donations to calculate total raised
  const donations = await prisma.donation.findMany();
  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);

  // Fetch goal from site settings
  const goalSetting = await prisma.siteSetting.findUnique({
    where: { key: 'fundraiserGoal' }
  });
  const goal = goalSetting ? parseInt(goalSetting.value, 10) : 10000;
  
  const progressPercentage = Math.min(100, (totalRaised / Math.max(goal, 1)) * 100);

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', minHeight: '60vh' }}>
      <div style={{ marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '1rem', textAlign: 'center' }}>
        <h1 className="font-serif" style={{ fontSize: '3.5rem', margin: 0, color: 'var(--primary)' }}>August Fundraiser</h1>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', marginBottom: '4rem' }}>
        
        {/* Left Column: Progress & Info */}
        <div>
          <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Help Us Reach Our Goal</h2>
          <p className="font-sans" style={{ fontSize: '1.25rem', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Your donations allow us to remain independent and continue bringing rigorous, conservative journalism to the BYU community. Please consider chipping in to our August Fundraiser!
          </p>
          
          <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className="font-sans font-bold" style={{ fontSize: '1.25rem', color: 'var(--accent)' }}>${totalRaised.toLocaleString()} Raised</span>
              <span className="font-sans text-muted" style={{ fontSize: '1.25rem' }}>Goal: ${goal.toLocaleString()}</span>
            </div>
            
            <div style={{ width: '100%', height: '2rem', backgroundColor: 'var(--background)', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: 'var(--accent)', transition: 'width 1s ease-in-out' }} />
            </div>
          </div>
        </div>

        {/* Right Column: Donation Form */}
        <div>
          <DonateForm />
        </div>

      </div>
    </div>
  );
}

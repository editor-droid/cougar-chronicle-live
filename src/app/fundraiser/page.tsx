import prisma from '@/lib/prisma';
import DonateForm from './DonateForm';
import { Target, Users, Globe } from 'lucide-react';

export default async function FundraiserPage() {
  const donations = await prisma.donation.findMany();
  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);

  const goalSetting = await prisma.siteSetting.findUnique({
    where: { key: 'fundraiserGoal' }
  });
  const goal = goalSetting ? parseInt(goalSetting.value, 10) : 10000;
  const progressPercentage = Math.min(100, (totalRaised / Math.max(goal, 1)) * 100);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Hero Section */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(var(--primary-rgb, 0,0,0), 0.05) 0%, rgba(var(--accent-rgb, 0,112,243), 0.1) 100%)',
        padding: '3rem 1rem 4rem',
        textAlign: 'center',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Background decorative elements */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '30%', height: '50%', background: 'radial-gradient(circle, rgba(var(--primary-rgb,0,0,0),0.03) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '40%', height: '60%', background: 'radial-gradient(circle, rgba(var(--accent-rgb,0,112,243),0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div className="container animate-fade-in" style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <h1 className="font-serif" style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '1rem', lineHeight: 1.1 }}>
            Fuel the Future of Independent Conservative Journalism
          </h1>
          <p className="font-sans" style={{ fontSize: '1.15rem', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            The Cougar Chronicle relies entirely on the generosity of readers like you. We&apos;re an independent student publication—not funded by BYU administration—and we don&apos;t run ads, so our reporting stays free to pursue the stories that matter.
          </p>

          {/* Progress Tracker inside Hero */}
          <div style={{ 
            background: 'var(--surface)', 
            padding: '1.5rem', 
            borderRadius: '0.75rem', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)',
            border: '1px solid rgba(var(--border-rgb, 0,0,0), 0.05)',
            transform: 'translateY(1rem)'
          }}>
            <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              August Fundraising Drive · America 250
            </h3>
            <p className="font-sans text-sm text-muted" style={{ marginBottom: '1rem', lineHeight: 1.45 }}>
              <strong>$25</strong> — America 250 Patriot (named gift).{' '}
              <strong>$48+</strong> — Founding Member for a year (premium digital + Print Volume PDF).
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'flex-end' }}>
              <span className="font-sans" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                ${totalRaised.toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--muted)' }}>raised</span>
              </span>
              <span className="font-sans text-muted" style={{ fontSize: '1rem', fontWeight: 600 }}>Goal: ${goal.toLocaleString()}</span>
            </div>
            
            <div style={{ width: '100%', height: '1.25rem', backgroundColor: 'var(--background)', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
              <div style={{ 
                width: `${progressPercentage}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--primary), var(--accent))', 
                transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)',
                  animation: 'shimmer 2s infinite linear'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', marginTop: '4rem' }}>
        
        {/* Left Column: Impact Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '0.75rem', color: 'var(--foreground)' }}>What Your Donation Means</h2>
            <p className="font-sans text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
              Every dollar contributed goes directly into the operation and expansion of The Cougar Chronicle. Here is exactly what we use our funding for:
            </p>
          </div>

          <div style={{ display: 'grid', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: 'rgba(var(--primary-rgb, 0,0,0), 0.05)', padding: '0.75rem', borderRadius: '50%' }}>
                <Target size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3 className="font-serif" style={{ fontSize: '1.35rem', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Uncompromising Truth</h3>
                <p className="font-sans text-muted" style={{ lineHeight: 1.6 }}>Your donation keeps us accountable to readers, not advertisers, so we can cover hard stories affecting the BYU community with honesty and integrity.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: 'rgba(var(--accent-rgb, 0,112,243), 0.1)', padding: '0.75rem', borderRadius: '50%' }}>
                <Users size={24} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="font-serif" style={{ fontSize: '1.35rem', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Student Opportunities</h3>
                <p className="font-sans text-muted" style={{ lineHeight: 1.6 }}>Funds go directly toward providing our talented student writers, editors, and photographers with stipends, professional resources, and real-world journalism experience.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ background: 'rgba(var(--primary-rgb, 0,0,0), 0.05)', padding: '0.75rem', borderRadius: '50%' }}>
                <Globe size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3 className="font-serif" style={{ fontSize: '1.35rem', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Print & Digital Reach</h3>
                <p className="font-sans text-muted" style={{ lineHeight: 1.6 }}>Help us expand our physical footprint across campus and the state of Utah by funding our physical print runs, along with maintaining our digital web infrastructure.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: The Form */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'sticky', top: '2rem' }}>
            <DonateForm />
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}

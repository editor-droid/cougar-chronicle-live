import prisma from '@/lib/prisma';
import Image from 'next/image';
import DonateForm from './DonateForm';
import { Target, Users, Globe } from 'lucide-react';
import { formatGoalDollars } from '@/lib/donations';
import { getFundraiserGoal } from '@/lib/fundraiser-goal';

export const dynamic = 'force-dynamic';

export default async function FundraiserPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; article?: string; success?: string; purchase?: string }>;
}) {
  const sp = (await searchParams) || {};
  const donations = await prisma.donation.findMany({
    where: { campaign: 'august_fundraiser' },
  });
  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);

  const goal = await getFundraiserGoal();
  const goalLabel = formatGoalDollars(goal);
  const progressPercentage = Math.min(100, (totalRaised / Math.max(goal, 1)) * 100);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Hero Section with campus photo */}
      <div style={{
        position: 'relative',
        padding: '3.5rem 1rem 5rem',
        textAlign: 'center',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        <Image
          src="/images/campus/byu-mountain-view-wide.jpg"
          alt="BYU campus and mountains in Provo"
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(27, 34, 83, 0.72) 0%, rgba(27, 34, 83, 0.78) 55%, rgba(27, 34, 83, 0.88) 100%)',
          }}
        />

        <div className="container animate-fade-in" style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <p
            className="font-sans"
            style={{
              color: 'rgba(255,255,255,0.8)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginBottom: '1rem',
            }}
          >
            Independent · Provo · Reader-funded
          </p>
          <h1 className="font-serif" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: 'white', marginBottom: '1rem', lineHeight: 1.15 }}>
            Fuel the Future of Independent Conservative Journalism
          </h1>
          <p className="font-sans" style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', marginBottom: '2rem', lineHeight: 1.6 }}>
            The Cougar Chronicle relies entirely on the generosity of readers like you. We&apos;re an independent student publication—not funded by BYU administration—and we don&apos;t run ads, so our reporting stays free to pursue the stories that matter.
          </p>

          {/* Progress Tracker inside Hero */}
          <div style={{
            background: 'var(--surface)',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.2)',
            transform: 'translateY(1rem)',
            textAlign: 'left',
          }}>
            <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              Fall Drive · {goalLabel} by Thanksgiving
            </h3>
            <p className="font-sans text-sm text-muted" style={{ marginBottom: '1rem', lineHeight: 1.45 }}>
              Help us raise <strong>{goalLabel} by Thanksgiving</strong> (Nov 26, 2026).{' '}
              <strong>$25 America 250 Patriot</strong> — you&apos;re recognized as a supporter on our donor list
              (not a physical gift).{' '}
              <strong>$48+ Founding Member</strong> — one year of access to{' '}
              <strong>premium digital articles</strong> (including print-edition pieces online), Print Volume PDF access, and gift unlocks.
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

      {/* Campus photo strip */}
      <div className="container" style={{ marginTop: '3.5rem', marginBottom: '1rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.65rem',
            borderRadius: '0.75rem',
            overflow: 'hidden',
          }}
        >
          {[
            { src: '/images/campus/byu-maeser.jpg', alt: 'Maeser Building on BYU campus' },
            { src: '/images/campus/y-mountain-blossoms.jpg', alt: 'Y Mountain from campus' },
            { src: '/images/campus/provo-city-center-temple.jpg', alt: 'Provo City Center Temple' },
          ].map((img) => (
            <div
              key={img.src}
              style={{
                position: 'relative',
                aspectRatio: '5 / 3',
                overflow: 'hidden',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
              }}
            >
              <Image src={img.src} alt={img.alt} fill sizes="33vw" style={{ objectFit: 'cover' }} />
            </div>
          ))}
        </div>
        <p
          className="font-sans text-muted text-center"
          style={{ fontSize: '0.9rem', marginTop: '0.85rem', fontStyle: 'italic' }}
        >
          Supporting independent coverage of campus, faith, and Utah — from Provo to the nation.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', marginTop: '2.5rem' }}>

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

          {/* Side campus photo under impact list */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              marginTop: '0.5rem',
            }}
          >
            <Image
              src="/images/campus/byu-y-mountain-stadium.jpg"
              alt="Y Mountain and BYU campus from LaVell Edwards Stadium"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
            />
            <div
              className="font-sans"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '2rem 1rem 0.75rem',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Y Mountain · LaVell Edwards Stadium · Provo
            </div>
          </div>
        </div>

        {/* Right Column: The Form */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'sticky', top: '2rem' }}>
            {sp.success === 'true' && (
              <div
                role="status"
                style={{
                  marginBottom: '1rem',
                  padding: '1rem 1.15rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(5, 150, 105, 0.35)',
                  backgroundColor: 'rgba(5, 150, 105, 0.1)',
                }}
              >
                <p className="font-serif" style={{ margin: 0, fontSize: '1.15rem', color: '#065f46', fontWeight: 600 }}>
                  Thank you{sp.purchase ? ` for your $${sp.purchase} gift` : ''}!
                </p>
                <p className="font-sans" style={{ margin: '0.4rem 0 0', color: '#047857', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  You&apos;re powering independent coverage of the BYU community.
                </p>
              </div>
            )}
            <DonateForm sourceFrom={sp.from} articleSlug={sp.article} goal={goal} />
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

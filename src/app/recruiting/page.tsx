import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import VolunteerForm from '@/components/VolunteerForm';
import { PenTool, Video, Camera, Search, Smartphone, BookOpen, Users, Flag, FileText, Podcast, HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'We Are Recruiting! | The Cougar Chronicle',
  description: 'Join the Cougar Chronicle team. Open positions for writers, editors, photographers, and more.',
};

export default function RecruitingPage() {
  const alumni = [
    {
      name: 'Jacob Christensen',
      role: 'PhD Candidate in Political Philosophy at Baylor University',
      quote: 'As Editor-in-Chief, I secured an internship at National Right to Life and launched the Chronicle’s first Print Edition.',
      image: 'https://i0.wp.com/staging-1d61-thecougarchronicle4.wpcomstaging.com/wp-content/uploads/2025/09/image2.jpeg?ssl=1'
    },
    {
      name: 'Joseph Addington',
      role: 'Associate Editor & Latin America Columnist at The American Conservative',
      quote: 'My time as Opinion Editor and interviewing Michael Knowles prepared me for a career in conservative journalism.',
      image: 'https://i0.wp.com/staging-1d61-thecougarchronicle4.wpcomstaging.com/wp-content/uploads/2025/09/image1.jpeg?ssl=1'
    },
    {
      name: 'Eva Terry',
      role: 'Fellow at Deseret News, Politics & Outdoors Beat',
      quote: 'Interning at Deseret News and The Spectator, and joining the White House press pool, shaped my journalism career.',
      image: 'https://i0.wp.com/staging-1d61-thecougarchronicle4.wpcomstaging.com/wp-content/uploads/2025/09/image0.jpeg?ssl=1'
    },
    {
      name: 'Thomas Stevenson',
      role: 'Political Editor at The Post Millennial',
      quote: 'As co-founder and Editor-in-Chief of the Cougar Chronicle, I led it to win ISI’s Collegiate Network Best New Publication in 2023.',
      image: 'https://i0.wp.com/staging-1d61-thecougarchronicle4.wpcomstaging.com/wp-content/uploads/2025/09/image0.png?ssl=1'
    },
    {
      name: 'Logan Spears',
      role: 'Entrepreneur, Local Business Owner',
      quote: 'As a senior contributor and editor for the Cougar Chronicle, I helped design and launch the first print edition.',
      image: 'https://i0.wp.com/thecougarchronicle.com/wp-content/uploads/2025/09/image0-1.jpeg?ssl=1'
    },
    {
      name: 'Ian Farris',
      role: 'Broadcast Journalist',
      quote: 'As the primary investigative journalist at the Chronicle, I adopted fake identities and wrote long-form editorial pieces.',
      image: 'https://i0.wp.com/thecougarchronicle.com/wp-content/uploads/2025/09/signal-2025-09-08-205004.jpeg?ssl=1'
    },
    {
      name: 'Luke Hanson',
      role: 'Conservative Immigration Organization Professional',
      quote: 'As co-founder and first social media manager of the Cougar Chronicle, I built its online presence.',
      image: 'https://i0.wp.com/thecougarchronicle.com/wp-content/uploads/2025/09/signal-2025-09-09-131357.jpeg?ssl=1'
    }
  ];

  const openPositions = [
    { title: 'Contributing Writer', icon: <PenTool size={24} /> },
    { title: 'Print Editor', icon: <FileText size={24} /> },
    { title: 'Video Editor', icon: <Video size={24} /> },
    { title: 'Photographer', icon: <Camera size={24} /> },
    { title: 'Investigative Journalist', icon: <Search size={24} /> },
    { title: 'Content Creator', icon: <Smartphone size={24} /> },
  ];

  const editorialFocus = [
    { title: 'BYU News', icon: <BookOpen size={24} /> },
    { title: 'Faith Issues', icon: <Users size={24} /> },
    { title: 'Family Issues', icon: <Users size={24} /> },
    { title: 'Utah Politics', icon: <Flag size={24} /> },
    { title: 'US Politics', icon: <Flag size={24} /> },
    { title: 'Conservative Thought', icon: <BookOpen size={24} /> },
  ];

  const majorOps = [
    { image: 'https://via.placeholder.com/800x600?text=Major+Event+1', title: 'Breaking the Silence' },
    { image: 'https://via.placeholder.com/800x600?text=Major+Event+2', title: 'Election Coverage' },
    { image: 'https://via.placeholder.com/800x600?text=Major+Event+3', title: 'Campus Investigations' },
  ];

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', paddingBottom: '4rem' }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '4rem', padding: '4rem 1rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '1rem' }}>
        <h1 className="font-serif" style={{ fontSize: '3.5rem', margin: '0 0 1rem 0', fontWeight: 700, color: 'white' }}>We Are Recruiting!</h1>
        <p className="font-sans" style={{ fontSize: '1.5rem', opacity: 0.9, marginBottom: '2rem' }}>Join the Cougar Chronicle Team</p>
        <a href="#apply" className="btn" style={{ backgroundColor: 'white', color: 'var(--primary)', fontSize: '1.15rem', padding: '0.75rem 2rem', fontWeight: 700, borderRadius: '2rem' }}>
          Apply Now
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
        
        {/* Open Positions */}
        <div>
          <h2 className="font-serif" style={{ fontSize: '2rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>Open Positions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {openPositions.map((pos, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--primary)' }}>{pos.icon}</span>
                <span className="font-sans" style={{ fontSize: '1.15rem', fontWeight: 600 }}>{pos.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Editorial Focus */}
        <div>
          <h2 className="font-serif" style={{ fontSize: '2rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>Editorial Focus</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {editorialFocus.map((focus, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--primary)' }}>{focus.icon}</span>
                <span className="font-sans" style={{ fontSize: '1.15rem', fontWeight: 600 }}>{focus.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Qualifications & Expectations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
        <div style={{ padding: '2rem', backgroundColor: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 className="font-serif" style={{ fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--primary)' }}>Qualifications</h3>
          <ul className="font-sans" style={{ fontSize: '1.1rem', lineHeight: 1.6, paddingLeft: '1.5rem', color: 'var(--muted)' }}>
            <li style={{ marginBottom: '0.5rem' }}>Must be a current student at any Utah school or any school owned by The Church of Jesus Christ of Latter-day Saints.</li>
            <li>Must be politically conservative.</li>
          </ul>
        </div>
        
        <div style={{ padding: '2rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 className="font-serif" style={{ fontSize: '1.75rem', marginBottom: '1rem', color: 'white' }}>What to Expect</h3>
          <ul className="font-sans" style={{ fontSize: '1.1rem', lineHeight: 1.6, paddingLeft: '1.5rem', opacity: 0.9 }}>
            <li style={{ marginBottom: '0.75rem' }}><strong>Writers:</strong> One article every 4 to 8 weeks.</li>
            <li style={{ marginBottom: '0.75rem' }}><strong>All staff:</strong> Similar pace, assigned to stories and projects as needed.</li>
            <li><strong>Creators:</strong> Can use personal accounts to collab with us as appropriate.</li>
          </ul>
        </div>
      </div>

      {/* Benefits */}
      <div style={{ marginBottom: '5rem' }}>
        <h2 className="font-serif text-center" style={{ fontSize: '2.5rem', marginBottom: '2.5rem', color: 'var(--primary)' }}>Benefits and Opportunities</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          
          <div style={{ padding: '2rem', backgroundColor: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)', textAlign: 'center' }}>
            <Users size={32} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
            <p className="font-sans" style={{ fontSize: '1.05rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Powerful networking with like-minded students, state and federal political leaders, policymakers, and journalists nationwide.
            </p>
          </div>
          
          <div style={{ padding: '2rem', backgroundColor: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)', textAlign: 'center' }}>
            <FileText size={32} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
            <p className="font-sans" style={{ fontSize: '1.05rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Valuable real-world experience in authentic, impactful journalism.
            </p>
          </div>
          
          <div style={{ padding: '2rem', backgroundColor: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)', textAlign: 'center' }}>
            <Podcast size={32} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
            <p className="font-sans" style={{ fontSize: '1.05rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Top stories open doors to podcast appearances and other publications — past writers featured on Fox News, the Charlie Kirk Show, and more!
            </p>
          </div>
          
          <div style={{ padding: '2rem', backgroundColor: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)', textAlign: 'center' }}>
            <Flag size={32} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
            <p className="font-sans" style={{ fontSize: '1.05rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Help advance the conservative cause and shape the discourse in Utah and beyond!
            </p>
          </div>

        </div>
      </div>

      {/* Major Ops / Staff Highlights (Placeholders) */}
      <div style={{ marginBottom: '5rem' }}>
        <h2 className="font-serif text-center" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Major Operations & Highlights</h2>
        <p className="font-sans text-center text-muted" style={{ fontSize: '1.15rem', marginBottom: '3rem' }}>
          A look at some of our biggest stories and events.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {majorOps.map((op, i) => (
            <div key={i} style={{ backgroundColor: 'var(--surface)', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                <Image 
                  src={op.image} 
                  alt={op.title} 
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)' }}>{op.title}</h3>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <a href="#apply" className="btn btn-primary" style={{ fontSize: '1.15rem', padding: '0.75rem 2rem', fontWeight: 700, borderRadius: '2rem' }}>
            Join Our Team Today
          </a>
        </div>
      </div>

      {/* Alumni Section */}
      <div style={{ marginBottom: '5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Alumni Achievements</h2>
          <p className="font-sans text-muted" style={{ fontSize: '1.15rem' }}>
            Our alumni have landed in some amazing places, from influential roles in DC to top news outlets. Here are a few highlights!
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {alumni.map((alum, i) => (
            <div key={i} style={{ backgroundColor: 'var(--background)', padding: '2rem', borderRadius: '0.75rem', border: '1px solid var(--border)', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <Image 
                src={alum.image} 
                alt={alum.name} 
                width={120}
                height={120}
                style={{ borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1.5rem', border: '3px solid var(--primary)' }}
              />
              <h3 className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.5rem' }}>{alum.name}</h3>
              <p className="font-sans text-primary" style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>{alum.role}</p>
              <p className="font-sans text-muted" style={{ fontSize: '0.95rem', fontStyle: 'italic', lineHeight: 1.6 }}>"{alum.quote}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Volunteer Form & CTA */}
      <div id="apply" style={{ padding: '3rem 0', textAlign: 'center', backgroundColor: 'var(--surface-hover)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
        <h2 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Apply Now</h2>
        <p className="font-sans text-muted" style={{ fontSize: '1.1rem', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Fill out the form below and we'll be in touch soon!
        </p>
        <VolunteerForm />
      </div>

    </div>
  );
}

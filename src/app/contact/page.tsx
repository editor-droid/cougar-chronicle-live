import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import VolunteerForm from '@/components/VolunteerForm';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with The Cougar Chronicle or join our team.',
  keywords: [
    'Contact conservative BYU writers',
    'Write for The Cougar Chronicle',
    'Daily Universe alternative',
    'Turning Point USA BYU'
  ]
};

export default function ContactPage() {
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

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      
      {/* Contact Section */}
      <div style={{ marginBottom: '2.5rem', maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h1 className="font-serif" style={{ fontSize: '3rem', margin: 0 }}>Contact Us</h1>
        </div>
        <p className="font-sans text-muted" style={{ fontSize: '1rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          We value your feedback and contributions. Use the form below (we do not publish our email publicly to avoid spam).
        </p>

        {/* Contact Form */}
        <ContactForm />
      </div>

      {/* Volunteer Section */}
      <div style={{ padding: '1.5rem 0 2rem', marginBottom: '2.5rem', textAlign: 'center' }}>
        <h2 className="font-serif" style={{ fontSize: '2rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Work with the Cougar Chronicle</h2>
        <p className="font-sans text-foreground" style={{ fontSize: '1rem', marginBottom: '1.25rem', lineHeight: 1.6, maxWidth: '700px', margin: '0 auto' }}>
          Looking for students interested in writing, editing, video, design, or copywriting. Contributing has opened doors to internships and opportunities unlike any other campus journalism.
        </p>
        
        <VolunteerForm />
      </div>

      {/* Alumni Section */}
      <div>
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

    </div>
  );
}

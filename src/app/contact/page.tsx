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
  ],
  openGraph: {
    title: 'Contact Us | The Cougar Chronicle',
    description: 'Get in touch with The Cougar Chronicle or join our team.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | The Cougar Chronicle',
    description: 'Get in touch with The Cougar Chronicle or join our team.',
    images: ['/default-og.png'],
  },
};

export default function ContactPage() {  return (
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


    </div>
  );
}

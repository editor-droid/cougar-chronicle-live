import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Reach out to the editors or submit a tip.',
};

export default function ContactPage() {
  return (
    <div style={{ padding: '3rem 2rem', minHeight: '60vh', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="font-serif" style={{ fontSize: '3.5rem', marginBottom: '2rem', color: 'var(--primary)', textAlign: 'center' }}>Contact Us</h1>
      
      <div className="font-sans" style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--foreground)' }}>
        <p style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          Have a story tip, a question, or a letter to the editor? We'd love to hear from you.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <a href="mailto:editor@thecougarchronicle.com" style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '1rem 2rem', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}>
            Email the Editorial Board
          </a>
        </div>
      </div>
    </div>
  );
}

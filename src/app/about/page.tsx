import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about The Cougar Chronicle, our mission, and our editorial board.',
};

export default function AboutPage() {
  const team = {
    editors: [
      { name: 'Reagan Sumrall', title: 'Editor-in-Chief' },
      { name: 'Kimball Call', title: 'Lead Editor & Senior Contributor' },
      { name: 'James Haymore', title: 'Senior Contributor' },
      { name: 'Alexander Halpren', title: '' }
    ],
    contributors: [
      { name: 'Jonah Deforge', title: '' },
      { name: 'Joshua Beck', title: '' },
      { name: 'Kai Schwemmer', title: '' },
      { name: 'Tanner Moss', title: '' }
    ],
    social: [
      { name: 'Jax McKinney', title: 'Senior Contributor & Social Media Director' },
      { name: 'Carter Waite', title: '' },
      { name: 'Joshua Beck', title: '' },
      { name: 'Dallin Webecke', title: '' }
    ],
    emeritus: [
      { name: 'Jacob Christensen', title: '' },
      { name: 'Ian Farris', title: '' },
      { name: 'Logan Spears', title: '' },
      { name: 'Joseph Addington', title: '' },
      { name: 'Thomas Stevenson', title: '' },
      { name: 'Luke Hanson', title: '' }
    ]
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 className="font-serif text-center" style={{ fontSize: '3.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>About Us</h1>
      <h2 className="font-sans text-center text-muted" style={{ fontSize: '1.25rem', marginBottom: '3rem', fontWeight: 400 }}>
        News for the BYU community, from the conservative perspective.
      </h2>
      
      <div className="font-sans" style={{ fontSize: '1.15rem', lineHeight: 1.8, color: 'var(--foreground)', marginBottom: '4rem', padding: '0 1rem' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          <strong>The Cougar Chronicle</strong> is an independently run student newspaper at BYU. Our mission is to articulate and spread the conservative perspective to the BYU community through the lens of the Gospel of Jesus Christ.
        </p>
        <p>
          We are not affiliated with BYU or the Church of Jesus Christ of Latter-day Saints. However, we wish to hold the standards and principles established in these institutions.
        </p>
      </div>

      <h2 className="font-serif text-center" style={{ fontSize: '2.5rem', marginBottom: '2.5rem', color: 'var(--primary)' }}>Our Team</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {/* Editors */}
        <div>
          <h3 className="font-sans" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 600, borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>Editors</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {team.editors.map((member, i) => (
              <div key={i} style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>{member.name}</div>
                {member.title && <div className="font-sans text-sm text-primary" style={{ fontWeight: 600 }}>{member.title}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Contributors */}
        <div>
          <h3 className="font-sans" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 600, borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>Contributors</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {team.contributors.map((member, i) => (
              <div key={i} style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>{member.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Media and Content */}
        <div>
          <h3 className="font-sans" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 600, borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>Social Media & Content</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {team.social.map((member, i) => (
              <div key={i} style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>{member.name}</div>
                {member.title && <div className="font-sans text-sm text-primary" style={{ fontWeight: 600 }}>{member.title}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Editors Emeritus */}
        <div>
          <h3 className="font-sans" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 600, borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>Editors Emeritus</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {team.emeritus.map((member, i) => (
              <div key={i} style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.25rem' }}>{member.name}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ padding: '6rem 2rem', minHeight: '60vh', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="font-serif" style={{ fontSize: '3.5rem', marginBottom: '2rem', color: 'var(--primary)', textAlign: 'center' }}>About Us</h1>
      
      <div className="font-sans" style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--foreground)' }}>
        <p style={{ marginBottom: '1.5rem' }}>
          <strong>The Cougar Chronicle</strong> is an independent, conservative student publication serving the Brigham Young University community. We are dedicated to providing rigorous journalism, thoughtful opinion, and deep exploration of faith rooted in Gospel principles.
        </p>
        <p style={{ marginBottom: '1.5rem' }}>
          Our mission is to foster a campus environment where conservative ideals are articulated clearly, defended robustly, and celebrated openly. We believe that true learning requires a diversity of thought, and we provide a platform for voices that are often underrepresented in modern academia.
        </p>
        <p>
          Founded by students, for students, we operate independently of the university administration to ensure editorial freedom and unwavering commitment to truth.
        </p>
      </div>
    </div>
  );
}

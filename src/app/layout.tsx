import type { Metadata } from 'next'

import Chatbot from '@/components/Chatbot';
import SubscribeModal from '@/components/SubscribeModal';
import SearchBar from '@/components/SearchBar';
import MobileMenu from '@/components/MobileMenu';
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || (process.env.NEXTAUTH_URL || 'http://localhost:3000')),
  title: {
    default: 'The Cougar Chronicle | Conservative News & Opinion',
    template: '%s | The Cougar Chronicle',
  },
  description: 'National-grade news platform for the BYU community. Faith, News, and Opinion.',
  keywords: [
    'BYU conservative news',
    'The Cougar Chronicle',
    'Brigham Young University independent news',
    'LDS conservative opinion',
    'BYU faith and news',
    'Conservative student newspaper',
    'Daily Universe alternative',
    'Turning Point USA BYU',
    'Provo Utah conservative news',
    'conservatives at byu',
    'byu conservatives'
  ],
  openGraph: {
    title: 'The Cougar Chronicle',
    description: 'Conservative News & Opinion for the BYU community.',
    url: '/',
    siteName: 'The Cougar Chronicle',
    images: [
      {
        url: '/default-og.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Cougar Chronicle',
    description: 'Conservative News & Opinion for the BYU community.',
    images: ['/default-og.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NewsMediaOrganization",
              "name": "The Cougar Chronicle",
              "url": "https://thecougarchronicle.com",
              "logo": "https://thecougarchronicle.com/icon.png",
              "sameAs": [
                "https://twitter.com/TheCougChron",
                "https://www.instagram.com/thecougchron/",
                "https://www.youtube.com/@TheCougChron",
                "http://facebook.com/thecougchron"
              ]
            })
          }}
        />
        <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.25rem 0', fontSize: '0.875rem' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
            <span className="font-sans font-bold">Follow Us:</span>
            <a href="https://twitter.com/TheCougChron" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 3.974H5.059z"/></svg>
            </a>
            <a href="https://www.instagram.com/thecougchron/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://www.youtube.com/@TheCougChron" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            <a href="http://facebook.com/thecougchron" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>
        <header className="site-header container">
          <div className="header-top">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="brand" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--primary)', lineHeight: 1 }}>
                <a href="/" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '22.3px', fontWeight: 400 }}>The</span>
                  <span style={{ fontSize: '40px', fontWeight: 400 }}>Cougar Chronicle</span>
                </a>
              </div>
              <span className="font-serif text-muted" style={{ fontSize: '0.95rem', fontStyle: 'italic', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
                Faith, Reason, and Politics at BYU
              </span>
            </div>
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <SearchBar />
              <SubscribeModal />
            </div>
            <MobileMenu />
          </div>
          
          <nav className="main-nav" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/category/news" className="nav-link font-sans">News</a>
            <a href="/category/faith" className="nav-link font-sans">Faith</a>
            <a href="/category/opinion" className="nav-link font-sans">Opinion</a>
            <a href="/print-edition" className="nav-link font-sans">Print Edition</a>
            <a href="/about" className="nav-link font-sans">About</a>
            <a href="/contact" className="nav-link font-sans">Contact</a>
            <a href="/donate" className="nav-link font-sans">Donate</a>
          </nav>
        </header>

        <main className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
          {children}
        </main>

        <Chatbot />

        <footer className="site-footer" style={{ backgroundColor: 'var(--primary)', color: 'white', marginTop: '0', paddingTop: '4rem', paddingBottom: '2rem', borderTop: 'none' }}>
          <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'left', marginBottom: '2rem' }}>
            <div>
              <h3 className="font-serif" style={{ color: 'white', marginBottom: '1rem', fontSize: '1.5rem' }}>The Cougar Chronicle</h3>
              <p className="font-sans text-sm" style={{ opacity: 0.8, lineHeight: 1.6 }}>
                Conservative news and opinion for the BYU community, rooted in Gospel principles. Independent insights on campus and culture.
              </p>
            </div>
            <div>
              <h4 className="font-sans" style={{ color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', fontSize: '0.875rem' }}>Sections</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><a href="/category/news" style={{ color: 'white', opacity: 0.8, textDecoration: 'none' }}>News</a></li>
                <li><a href="/category/faith" style={{ color: 'white', opacity: 0.8, textDecoration: 'none' }}>Faith</a></li>
                <li><a href="/category/opinion" style={{ color: 'white', opacity: 0.8, textDecoration: 'none' }}>Opinion</a></li>
                <li><a href="/print-edition" style={{ color: 'white', opacity: 0.8, textDecoration: 'none' }}>Print Edition</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-sans" style={{ color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', fontSize: '0.875rem' }}>Information</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><a href="/about" style={{ color: 'white', opacity: 0.8, textDecoration: 'none' }}>About Us</a></li>
                <li><a href="/contact" style={{ color: 'white', opacity: 0.8, textDecoration: 'none' }}>Contact</a></li>
                <li><a href="/donate" style={{ color: 'white', opacity: 0.8, textDecoration: 'none' }}>Donate</a></li>
                <li><a href="/account" style={{ color: 'white', opacity: 0.8, textDecoration: 'none' }}>My Account</a></li>
                <li><a href="/login" style={{ color: 'white', opacity: 0.8, textDecoration: 'none' }}>Staff Login</a></li>
              </ul>
            </div>
          </div>
          <div className="container" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <p className="font-sans text-sm" style={{ opacity: 0.6 }}>&copy; {new Date().getFullYear()} The Cougar Chronicle. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '1rem', opacity: 0.8 }}>
              <a href="https://twitter.com/TheCougChron" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 3.974H5.059z"/></svg></a>
              <a href="https://www.instagram.com/thecougchron/" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>
              <a href="https://www.youtube.com/@TheCougChron" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
              <a href="http://facebook.com/thecougchron" target="_blank" rel="noopener noreferrer" style={{ color: 'white' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google';
import Chatbot from '@/components/Chatbot';
import './globals.css'

export const metadata: Metadata = {
  title: 'Cougar Chronicle | Conservative News & Opinion',
  description: 'National-grade news platform for the BYU community. Faith, News, and Opinion.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header container">
          <div className="header-top">
            <div className="brand" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--primary)', lineHeight: 1 }}>
              <a href="/" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '22.3px', fontWeight: 400 }}>The</span>
                <span style={{ fontSize: '40px', fontWeight: 400 }}>Cougar Chronicle</span>
              </a>
            </div>
            <nav className="main-nav">

              <a href="/category/news" className="nav-link font-sans">News</a>
              <a href="/category/faith" className="nav-link font-sans">Faith</a>
              <a href="/category/opinion" className="nav-link font-sans">Opinion</a>
            </nav>
            <div className="header-actions">
              <button className="btn btn-primary">Subscribe</button>
            </div>
          </div>
        </header>

        <main className="container animate-fade-in">
          {children}
        </main>

        <Chatbot />

        <footer className="site-footer container">
          <p>&copy; {new Date().getFullYear()} The Cougar Chronicle. All rights reserved.</p>
        </footer>
      </body>
      <GoogleAnalytics gaId="G-XYZ1234567" />
    </html>
  )
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import SearchBar from './SearchBar';
import SubscribeModal from './SubscribeModal';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu when the route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="mobile-menu-wrapper">
      <button 
        onClick={() => setIsOpen(true)}
        className="mobile-menu-btn"
        aria-label="Open menu"
      >
        <Menu size={28} color="var(--primary)" />
      </button>

      {isOpen && (
        <div className="mobile-menu-overlay animate-fade-in">
          <div className="mobile-menu-content">
            <div className="mobile-menu-header">
              <span className="font-serif" style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 700 }}>Menu</span>
              <button 
                onClick={() => setIsOpen(false)}
                className="mobile-menu-close"
                aria-label="Close menu"
              >
                <X size={28} color="var(--primary)" />
              </button>
            </div>

            <div className="mobile-menu-body">
              <div className="mobile-menu-actions">
                <SearchBar />
                <SubscribeModal />
              </div>

              <nav className="mobile-nav-links">
                <Link href="/category/news" className="mobile-nav-link font-sans">News</Link>
                <Link href="/category/faith" className="mobile-nav-link font-sans">Faith</Link>
                <Link href="/category/opinion" className="mobile-nav-link font-sans">Opinion</Link>
                <Link href="/america-250" className="mobile-nav-link font-sans" style={{ color: 'var(--primary)', fontWeight: 600 }}>America 250</Link>
                <Link href="/print-edition" className="mobile-nav-link font-sans">Print Edition</Link>
                <Link href="/videos" className="mobile-nav-link font-sans">Videos</Link>
                <Link href="/about" className="mobile-nav-link font-sans">About</Link>
                <Link href="/contact" className="mobile-nav-link font-sans">Contact</Link>
                <Link href="/donate" className="mobile-nav-link font-sans">Donate</Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

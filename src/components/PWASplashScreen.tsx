"use client";

import { useEffect, useState } from 'react';

export default function PWASplashScreen() {
  const [showSplash, setShowSplash] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Check if the app is running in standalone mode (PWA)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone || 
      document.referrer.includes('android-app://');

    // Also check sessionStorage so we only show the splash once per session
    // instead of every time they refresh or navigate
    const hasSeenSplash = sessionStorage.getItem('pwa_splash_seen');

    if (isStandalone && !hasSeenSplash) {
      setShowSplash(true);
      sessionStorage.setItem('pwa_splash_seen', 'true');

      // Start fade out after 1.5 seconds
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 1500);

      // Remove from DOM entirely after fade transition (0.5s)
      const removeTimer = setTimeout(() => {
        setShowSplash(false);
      }, 2000);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, []);

  if (!showSplash) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--primary)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        opacity: isFading ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: 'none', // prevent blocking taps while fading
      }}
    >
      <div 
        style={{
          fontFamily: "'Cormorant Garamond', serif", 
          color: 'white', 
          lineHeight: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}
      >
        <span style={{ fontSize: '1.5rem', fontWeight: 400, opacity: 0.9 }}>The</span>
        <span style={{ fontSize: '3rem', fontWeight: 600, textAlign: 'center' }}>Cougar Chronicle</span>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .7; }
        }
      `}} />
    </div>
  );
}

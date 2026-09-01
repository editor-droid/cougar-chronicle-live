'use client';

import { useCallback, useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const hiddenOn = (pathname: string) =>
  pathname.startsWith('/dashboard') ||
  pathname.startsWith('/admin') ||
  pathname === '/links' ||
  pathname.startsWith('/links/');

const fixedChrome: CSSProperties = {
  position: 'fixed',
  bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
  right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
  zIndex: 9999,
  transform: 'translate3d(0, 0, 0)',
  WebkitBackfaceVisibility: 'hidden',
  backfaceVisibility: 'hidden',
};

function ChatbotFab({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="chatbot-launcher"
      style={{
        ...fixedChrome,
        display: 'flex',
        alignItems: 'flex-end',
        flexDirection: 'column',
        gap: '0.75rem',
        pointerEvents: 'none',
      }}
    >
      <div
        className="chatbot-bubble"
        style={{
          backgroundColor: 'white',
          border: '1px solid var(--border)',
          padding: '0.75rem 1rem',
          borderRadius: '1rem',
          borderBottomRightRadius: '0.25rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
        onClick={onClick}
      >
        <p className="font-sans text-sm" style={{ fontWeight: 600, margin: 0 }}>
          Have a question? Ask our AI!
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        aria-label="Open AI Chatbot"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-foreground)',
          border: 'none',
          boxShadow: '0 4px 18px rgba(27, 34, 83, 0.35)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          pointerEvents: 'auto',
          flexShrink: 0,
        }}
      >
        <Image
          src="/chat-icon.png"
          alt="Chat"
          width={56}
          height={56}
          style={{ objectFit: 'cover', width: 56, height: 56 }}
        />
      </button>
    </div>
  );
}

export default function ChatbotLauncher() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [Chatbot, setChatbot] = useState<ComponentType<{ initialOpen?: boolean }> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = useCallback(() => {
    if (Chatbot) return;
    void import('./Chatbot').then((mod) => {
      setChatbot(() => mod.default);
    });
  }, [Chatbot]);

  if (hiddenOn(pathname)) return null;
  if (!mounted) return null;
  if (Chatbot) return <Chatbot initialOpen />;

  return createPortal(<ChatbotFab onClick={handleOpen} />, document.body);
}

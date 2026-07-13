'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Check, Link2, Mail, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';

type ShareButtonProps = {
  title: string;
  url?: string;
  text?: string;
};

/**
 * Mobile / PWA: native share sheet (Safari/iOS/Android).
 * Desktop: dropdown with Copy link, X, Facebook, Email.
 */
export default function ShareButton({ title, url, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const getShareUrl = () =>
    url || (typeof window !== 'undefined' ? window.location.href : '');

  const copyLink = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', shareUrl);
    }
  };

  const share = async () => {
    const shareUrl = getShareUrl();
    const shareData: ShareData = {
      title,
      text: text || title,
      url: shareUrl,
    };

    // Prefer native sheet when the browser actually supports it (phone Safari/PWA)
    const canNativeShare =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      // Desktop Chrome often has share only in limited cases; still try if canShare ok
      (typeof navigator.canShare !== 'function' || navigator.canShare(shareData));

    // Touch / coarse pointer ≈ mobile-ish; use native share there first
    const prefersNative =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    if (canNativeShare && prefersNative) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // fall through to menu / copy
      }
    }

    // Desktop (and native share failures): open share menu
    setMenuOpen((o) => !o);
  };

  const shareUrl = typeof window !== 'undefined' ? getShareUrl() : '';
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={share}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: 0,
          color: 'inherit',
          font: 'inherit',
        }}
        title="Share article"
        aria-label="Share article"
        aria-expanded={menuOpen}
      >
        {copied ? (
          <Check size={18} color="var(--primary)" />
        ) : (
          <Share2 size={18} color="currentColor" />
        )}
      </button>

      {menuOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            minWidth: '11.5rem',
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #E5E3D8)',
            borderRadius: '0.5rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '0.35rem',
            color: 'var(--foreground, #1A1A1A)',
          }}
        >
          <MenuItem
            icon={<Link2 size={15} />}
            label={copied ? 'Copied!' : 'Copy link'}
            onClick={async () => {
              await copyLink(getShareUrl());
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon={<XIcon size={15} />}
            label="Share on X"
            onClick={() => {
              window.open(
                `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
                '_blank',
                'noopener,noreferrer'
              );
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            }
            label="Facebook"
            onClick={() => {
              window.open(
                `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
                '_blank',
                'noopener,noreferrer'
              );
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon={<Mail size={15} />}
            label="Email"
            onClick={() => {
              window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
              setMenuOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="font-sans"
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.55rem 0.65rem',
        border: 'none',
        background: 'transparent',
        borderRadius: '0.35rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
        color: 'inherit',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-hover, #F0EFEA)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ display: 'flex', opacity: 0.85 }}>{icon}</span>
      {label}
    </button>
  );
}

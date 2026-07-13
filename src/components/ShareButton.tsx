'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

type ShareButtonProps = {
  title: string;
  url?: string;
  text?: string;
};

/**
 * Opens the OS share sheet when available (iOS Safari, Android, many PWAs).
 * Falls back to copying the link on desktop browsers without Web Share API.
 */
export default function ShareButton({ title, url, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const shareUrl =
      url ||
      (typeof window !== 'undefined' ? window.location.href : '');
    const shareData: ShareData = {
      title,
      text: text || title,
      url: shareUrl,
    };

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        // Some browsers throw if canShare is false; try share directly.
        if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
          // Retry with URL only
          await navigator.share({ url: shareUrl, title });
        } else {
          await navigator.share(shareData);
        }
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Link copied');
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // Last resort: prompt
      window.prompt('Copy this link:', shareUrl);
    } catch (err: unknown) {
      // User cancelled the share sheet — not an error
      if (err instanceof DOMException && err.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Link copied');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Could not share this article.');
      }
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: 0,
        color: 'inherit',
      }}
      title="Share article"
      aria-label="Share article"
    >
      {copied ? (
        <Check size={18} color="var(--primary)" />
      ) : (
        <Share2 size={18} color="currentColor" />
      )}
    </button>
  );
}

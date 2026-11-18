'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import SubscribeForm from '@/components/SubscribeForm';
import { NEWSLETTER_BAR_DISMISS_KEY, NEWSLETTER_JOINED_KEY } from '@/lib/newsletter-signup';

function hideOnPath(pathname: string): boolean {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
}

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * Mobile-only bar. It is position:fixed (and portaled to body) so it never
 * changes document flow. Dismissal and a completed signup stay in localStorage.
 * Logged-in readers already on the newsletter list are skipped when GET
 * /api/subscribe can see their session.
 */
export default function NewsletterStickyBar() {
  const pathname = usePathname() || '/';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hideOnPath(pathname) || readFlag(NEWSLETTER_BAR_DISMISS_KEY) || readFlag(NEWSLETTER_JOINED_KEY)) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    fetch('/api/subscribe', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return { subscribed: false };
        return (await res.json()) as { subscribed?: boolean };
      })
      .then((data) => {
        if (cancelled) return;
        if (data.subscribed) {
          try {
            window.localStorage.setItem(NEWSLETTER_JOINED_KEY, '1');
          } catch {
            // Private mode: just keep the bar hidden this visit.
          }
          return;
        }
        setVisible(true);
      })
      .catch(() => {
        if (!cancelled) setVisible(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname]);

  if (!visible || hideOnPath(pathname)) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(NEWSLETTER_BAR_DISMISS_KEY, '1');
    } catch {
      // Still hide for this visit.
    }
    setVisible(false);
  };

  return createPortal(
    <div className="nl-sticky" role="region" aria-label="Newsletter signup">
      <SubscribeForm layout="bar" onSuccess={() => setVisible(false)} />
      <button type="button" className="nl-sticky-dismiss" onClick={dismiss} aria-label="Dismiss newsletter signup">
        ×
      </button>
    </div>,
    document.body
  );
}

'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (el?: HTMLElement | null) => void;
      };
      ready?: (cb: () => void) => void;
    };
  }
}

const SCRIPT_SRC = 'https://platform.twitter.com/widgets.js';
const SCRIPT_ID = 'x-widgets-js';

function loadWidgetsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.twttr?.widgets) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => {
      if (window.twttr?.widgets) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      // Already loaded but twttr not yet assigned
      const t = window.setInterval(() => {
        if (window.twttr?.widgets) {
          window.clearInterval(t);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(t);
        resolve();
      }, 5000);
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.charset = 'utf-8';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load X widgets.js'));
    document.body.appendChild(s);
  });
}

/**
 * Loads X/Twitter widgets.js and hydrates any .twitter-tweet blockquotes
 * in the article. Safe to mount on every article page.
 */
export default function TwitterEmbedHydrator({
  rootSelector = '.article-content',
  watch,
}: {
  rootSelector?: string;
  /** Remount / re-hydrate when preview HTML changes */
  watch?: string;
}) {
  useEffect(() => {
    const root = document.querySelector(rootSelector);
    if (!root) return;
    if (!root.querySelector('.twitter-tweet, .tweet-embed, [data-tweet-embed]')) return;

    let cancelled = false;

    (async () => {
      try {
        await loadWidgetsScript();
        if (cancelled) return;
        const run = () => {
          window.twttr?.widgets?.load(root as HTMLElement);
        };
        if (window.twttr?.ready) {
          window.twttr.ready(run);
        } else {
          run();
        }
        // Re-run after a tick — React may still be painting
        window.setTimeout(run, 100);
        window.setTimeout(run, 500);
      } catch (e) {
        console.warn('[TwitterEmbedHydrator]', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rootSelector, watch]);

  return null;
}

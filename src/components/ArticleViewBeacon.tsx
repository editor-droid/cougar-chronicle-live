'use client';

import { useEffect } from 'react';
import { ARTICLE_VIEW_WINDOW_SEC } from '@/lib/article-views';

const STORAGE_KEY = 'cc_views';
const WINDOW_MS = ARTICLE_VIEW_WINDOW_SEC * 1000;

/**
 * Counts a real article open once per browser tab session, then lets the
 * server cookie suppress repeats for 24h (including other tabs).
 *
 * sessionStorage is written before the request so a refresh that lands
 * before Set-Cookie comes back does not send a second beacon. Link prefetch
 * never mounts this effect.
 */
function alreadyMarked(postId: string): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const marks = JSON.parse(raw) as Record<string, number>;
    const until = marks[postId];
    return typeof until === 'number' && until > Date.now();
  } catch {
    return false;
  }
}

function mark(postId: string) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const marks: Record<string, number> = raw ? JSON.parse(raw) : {};
    marks[postId] = Date.now() + WINDOW_MS;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(marks));
  } catch {
    // Private mode can reject storage. The server cookie still dedupes.
  }
}

function unmark(postId: string) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const marks = JSON.parse(raw) as Record<string, number>;
    delete marks[postId];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(marks));
  } catch {
    // Ignore storage failures.
  }
}

export default function ArticleViewBeacon({ postId }: { postId: string }) {
  useEffect(() => {
    if (!postId || alreadyMarked(postId)) return;
    mark(postId);

    fetch('/api/views', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId }),
      credentials: 'same-origin',
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) unmark(postId);
      })
      .catch(() => {
        unmark(postId);
      });
  }, [postId]);

  return null;
}

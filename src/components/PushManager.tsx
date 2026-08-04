'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

const PROMPT_KEY = 'push_prompted';
const PROMPT_AT_KEY = 'push_prompted_at';
/** Don't re-prompt for 90 days after dismiss/enable */
const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

function hasRecentPrompt(): boolean {
  if (typeof window === 'undefined') return true;
  if (localStorage.getItem(PROMPT_KEY) === 'true') return true;
  const at = Number(localStorage.getItem(PROMPT_AT_KEY) || 0);
  if (at && Date.now() - at < COOLDOWN_MS) return true;
  return false;
}

function markPrompted() {
  try {
    localStorage.setItem(PROMPT_KEY, 'true');
    localStorage.setItem(PROMPT_AT_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export default function PushManager() {
  const pathname = usePathname();
  const shownThisSession = useRef(false);

  useEffect(() => {
    // Never prompt on admin, auth, or link hub
    if (
      !pathname ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/api') ||
      pathname === '/links' ||
      pathname.startsWith('/links/')
    ) {
      return;
    }

    // One toast per browser session max, and respect long cooldown
    if (shownThisSession.current || hasRecentPrompt()) return;

    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      Notification.permission !== 'default'
    ) {
      // Already decided or unsupported — don't keep asking
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission !== 'default'
      ) {
        markPrompted();
      }
    } else {
      const timer = setTimeout(() => {
        if (shownThisSession.current || hasRecentPrompt()) return;
        shownThisSession.current = true;
        // Mark immediately so navigation / remounts don't spam
        markPrompted();

        toast('Enable Notifications', {
          id: 'push-enable-prompt',
          description: 'Get alerted when we publish new articles or videos.',
          action: {
            label: 'Enable',
            onClick: async () => {
              await requestPushSubscription();
            },
          },
          cancel: {
            label: 'Not now',
            onClick: () => {
              /* already marked */
            },
          },
          duration: 8000,
          onDismiss: () => markPrompted(),
          onAutoClose: () => markPrompted(),
        });
      }, 8000);

      return () => clearTimeout(timer);
    }

    // If they already allowed notifications but we never saved a push subscription
    // (common after first iOS prompt), silently complete registration — no toast.
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      'serviceWorker' in navigator
    ) {
      ensurePushSubscription().catch(() => {
        /* non-blocking */
      });
    }
  }, [pathname]);

  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Ensure SW push subscription exists and is saved server-side (no UI). */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY missing');
      return false;
    }
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  return res.ok;
}

export async function requestPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    toast.error('Push notifications are not supported by this browser.');
    return false;
  }

  if (!('Notification' in window)) {
    toast.error('Notifications are not available on this device.');
    return false;
  }

  try {
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'denied') {
      toast.error(
        'Notifications are blocked. On iPhone: Settings → Chronicle → Notifications → Allow.'
      );
      return false;
    }
    if (permission !== 'granted') {
      toast.error('Notification permission was not granted.');
      return false;
    }

    const ok = await ensurePushSubscription();
    if (!ok) {
      toast.error('Could not register this device for push. Try again in a moment.');
      return false;
    }

    markPrompted();
    toast.success('Notifications enabled on this device!');
    return true;
  } catch (error) {
    console.error('Error enabling notifications:', error);
    toast.error('Failed to enable notifications.');
    return false;
  }
}

export async function unsubscribePush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
    toast.success('Notifications disabled on this device.');
    return true;
  } catch (error) {
    console.error('Error disabling notifications:', error);
    toast.error('Could not disable notifications.');
    return false;
  }
}

'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export default function PushManager() {
  useEffect(() => {
    // No login required — guests and signed-in users both get the prompt.
    const hasPrompted = localStorage.getItem('push_prompted');

    if (
      !hasPrompted &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      Notification.permission === 'default'
    ) {
      const timer = setTimeout(() => {
        toast('Enable Notifications', {
          description: 'Get alerted when we publish new articles or videos.',
          action: {
            label: 'Enable',
            onClick: async () => {
              localStorage.setItem('push_prompted', 'true');
              await requestPushSubscription();
            },
          },
          cancel: {
            label: 'Maybe later',
            onClick: () => {
              localStorage.setItem('push_prompted', 'true');
            },
          },
          duration: 12000,
        });
      }, 3000);

      return () => clearTimeout(timer);
    }

    // If they already allowed notifications but we never saved a push subscription
    // (common after first iOS prompt), silently complete registration.
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
  }, []);

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

    localStorage.setItem('push_prompted', 'true');
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

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function PushManager() {
  useEffect(() => {
    // Only prompt if permission is default (meaning they haven't explicitly allowed or blocked it yet)
    // and if we haven't prompted them in this session/local storage
    const hasPrompted = localStorage.getItem('push_prompted');
    
    if (!hasPrompted && 'Notification' in window && 'serviceWorker' in navigator && Notification.permission === 'default') {
      setTimeout(() => {
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
            }
          },
          duration: 10000,
        });
      }, 3000); // 3 second delay
    }
  }, []);

  return null;
}

export async function requestPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    toast.error('Push notifications are not supported by this browser.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notification permission was denied.');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not found');
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });

    toast.success('Notifications enabled!');
    return true;
  } catch (error) {
    console.error('Error enabling notifications:', error);
    toast.error('Failed to enable notifications.');
    return false;
  }
}

export async function unsubscribePush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      toast.success('Notifications disabled.');
    }
  } catch (error) {
    console.error('Error disabling notifications:', error);
  }
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

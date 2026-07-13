'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  requestPushSubscription,
  unsubscribePush,
  ensurePushSubscription,
} from './PushManager';

type Status = 'loading' | 'unsupported' | 'denied' | 'off' | 'on';

export default function PushSettings() {
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState('');

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      setDetail('Push notifications need a supported browser or the installed app.');
      return;
    }

    const permission = Notification.permission;

    if (permission === 'denied') {
      setStatus('denied');
      setDetail(
        'Notifications are blocked for this site. On iPhone: Settings → Chronicle (or Safari) → Notifications → Allow, then tap Enable again.'
      );
      return;
    }

    try {
      // If OS already allowed, make sure we have a push subscription saved
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          // Permission yes, subscription no — finish registration quietly
          await ensurePushSubscription();
          sub = await reg.pushManager.getSubscription();
        }
        if (sub) {
          setStatus('on');
          setDetail('You will receive alerts for new articles and videos on this device.');
          return;
        }
      }

      setStatus('off');
      setDetail('Stay up to date with breaking news and new videos on this device.');
    } catch (e) {
      console.error(e);
      setStatus('off');
      setDetail('Could not read notification status. Try Enable below.');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (status === 'on') {
        const ok = await unsubscribePush();
        if (ok) await refresh();
      } else {
        // denied → still try (will show toast with Settings instructions)
        const ok = await requestPushSubscription();
        if (ok) await refresh();
        else await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') {
    return (
      <p className="font-sans text-sm" style={{ opacity: 0.7 }}>
        Checking notification status…
      </p>
    );
  }

  if (status === 'unsupported') {
    return (
      <p className="font-sans text-sm" style={{ opacity: 0.7 }}>
        {detail}
      </p>
    );
  }

  const enabled = status === 'on';
  const label =
    status === 'denied'
      ? 'Open Settings to Allow'
      : enabled
        ? 'Disable Notifications on this Device'
        : 'Enable Notifications on this Device';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          className={`btn font-sans text-sm ${enabled ? 'btn-secondary' : 'btn-primary'}`}
          style={{ opacity: busy ? 0.7 : 1, minWidth: '12rem' }}
        >
          {busy ? 'Working…' : label}
        </button>
        <span
          className="font-sans text-sm"
          style={{
            fontWeight: 600,
            color: enabled ? '#15803d' : status === 'denied' ? '#b91c1c' : 'var(--muted)',
          }}
        >
          {enabled ? 'Enabled on this device' : status === 'denied' ? 'Blocked' : 'Not enabled'}
        </span>
      </div>
      <p className="font-sans text-sm text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
        {detail}
      </p>
      <p className="font-sans text-xs text-muted" style={{ margin: 0, opacity: 0.85 }}>
        No tracking links required — status is read from this browser/app. Each device must enable
        notifications separately.
      </p>
    </div>
  );
}

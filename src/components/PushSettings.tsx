'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  requestPushSubscription,
  unsubscribePush,
  ensurePushSubscription,
} from './PushManager';

type Status = 'loading' | 'unsupported' | 'denied' | 'off' | 'on';

type Prefs = {
  wantsNews: boolean;
  wantsFaith: boolean;
  wantsOpinion: boolean;
  wantsVideos: boolean;
  wantsBreaking: boolean;
};

const defaultPrefs: Prefs = {
  wantsNews: true,
  wantsFaith: true,
  wantsOpinion: true,
  wantsVideos: true,
  wantsBreaking: true,
};

export default function PushSettings() {
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState('');
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

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
        'Notifications are blocked. On iPhone: Settings → Chronicle → Notifications → Allow.'
      );
      return;
    }

    try {
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          await ensurePushSubscription();
          sub = await reg.pushManager.getSubscription();
        }
        if (sub) {
          setStatus('on');
          setDetail('Alerts on this device follow the topics below.');
          return;
        }
      }
      setStatus('off');
      setDetail('Enable notifications, then choose which topics you want.');
    } catch (e) {
      console.error(e);
      setStatus('off');
      setDetail('Could not read notification status.');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const savePrefs = async (next: Prefs) => {
    setPrefs(next);
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferencesOnly: true, prefs: next }),
      });
      // Also re-send with full subscription if we have one
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...sub.toJSON(), prefs: next }),
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (status === 'on') {
        await unsubscribePush();
        await refresh();
      } else {
        const ok = await requestPushSubscription();
        if (ok) {
          await savePrefs(prefs);
        }
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') {
    return <p className="font-sans text-sm" style={{ opacity: 0.7 }}>Checking notification status…</p>;
  }
  if (status === 'unsupported') {
    return <p className="font-sans text-sm" style={{ opacity: 0.7 }}>{detail}</p>;
  }

  const enabled = status === 'on';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={busy}
          className={`btn font-sans text-sm ${enabled ? 'btn-secondary' : 'btn-primary'}`}
          style={{ opacity: busy ? 0.7 : 1 }}
        >
          {busy ? 'Working…' : enabled ? 'Disable on this Device' : 'Enable on this Device'}
        </button>
        <span
          className="font-sans text-sm"
          style={{ fontWeight: 600, color: enabled ? '#15803d' : status === 'denied' ? '#b91c1c' : 'var(--muted)' }}
        >
          {enabled ? 'Enabled' : status === 'denied' ? 'Blocked' : 'Not enabled'}
        </span>
      </div>
      <p className="font-sans text-sm text-muted" style={{ margin: 0 }}>{detail}</p>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p className="font-sans text-sm font-bold" style={{ margin: '0.25rem 0' }}>
            Topics for this device
          </p>
          {(
            [
              ['wantsBreaking', 'Breaking alerts'],
              ['wantsNews', 'News'],
              ['wantsFaith', 'Faith'],
              ['wantsOpinion', 'Opinion'],
              ['wantsVideos', 'Videos'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => savePrefs({ ...prefs, [key]: e.target.checked })}
                style={{ width: '1.1rem', height: '1.1rem' }}
              />
              <span className="font-sans text-sm">{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

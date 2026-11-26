'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { SPORT_SPECS } from '@/lib/scores/paths';
import type { SportKey } from '@/lib/scores/types';

const SPORTS = (Object.keys(SPORT_SPECS) as SportKey[]).map((key) => ({
  key,
  label: SPORT_SPECS[key].label,
}));

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(subscription: PushSubscription, publicKey: string) {
  const existing = subscription.options.applicationServerKey;
  if (!existing) return false;
  const next = urlBase64ToUint8Array(publicKey);
  const bytes = new Uint8Array(existing);
  if (bytes.length !== next.length) return false;
  return bytes.every((byte, index) => byte === next[index]);
}

async function sportsRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/sports-alerts/sw.js');
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker || worker.state === 'activated') return registration;
  await new Promise<void>((resolve, reject) => {
    const done = () => {
      if (worker.state === 'activated') resolve();
      if (worker.state === 'redundant') reject(new Error('alerts worker failed'));
    };
    worker.addEventListener('statechange', done);
    done();
  });
  return registration;
}

export default function GameDayAlerts({ sport }: { sport?: SportKey }) {
  const [picked, setPicked] = useState<SportKey[]>(sport ? [sport] : []);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'email' | 'push' | null>(null);
  const [pushOn, setPushOn] = useState(true);
  const [emailOn, setEmailOn] = useState(true);

  useEffect(() => {
    let cancel = false;
    fetch('/api/sports/alerts/vapid')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { push?: boolean; email?: boolean } | null) => {
        if (cancel || !data) return;
        setPushOn(Boolean(data.push));
        setEmailOn(Boolean(data.email));
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  function toggle(key: SportKey) {
    setPicked((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  }

  async function onEmail(event: FormEvent) {
    event.preventDefault();
    setBusy('email');
    setMessage('');
    try {
      const res = await fetch('/api/sports/alerts/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sports: picked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === 'string' ? data.error : 'Could not sign you up.');
        return;
      }
      setMessage(data.status === 'updated'
        ? 'Your sports are updated.'
        : 'Check your email and click confirm. Alerts start after that.');
    } catch {
      setMessage('Could not sign you up.');
    } finally {
      setBusy(null);
    }
  }

  async function onPush() {
    setBusy('push');
    setMessage('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setMessage('This browser cannot receive alerts.');
        return;
      }
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage('Notifications are blocked for this browser.');
        return;
      }
      const configRes = await fetch('/api/sports/alerts/vapid');
      const config = await configRes.json().catch(() => ({}));
      if (!configRes.ok || typeof config.publicKey !== 'string' || !config.publicKey) {
        setMessage('Browser alerts are not available.');
        return;
      }
      const registration = await sportsRegistration();
      const applicationServerKey = urlBase64ToUint8Array(config.publicKey);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !sameKey(subscription, config.publicKey)) {
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }
      const res = await fetch('/api/sports/alerts/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subscription.toJSON(), sports: picked }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(res.ok
        ? 'This browser will get alerts for the sports you checked.'
        : (typeof data.error === 'string' ? data.error : 'Could not enable browser alerts.'));
    } catch {
      setMessage('Could not enable browser alerts.');
    } finally {
      setBusy(null);
    }
  }

  if (!pushOn && !emailOn) {
    return (
      <section className="sports-alerts" aria-label="Game-day alerts">
        <h2 className="font-serif">Game-day alerts</h2>
        <p className="sports-note">Game-day alerts are turned off.</p>
      </section>
    );
  }

  return (
    <section className="sports-alerts" aria-label="Game-day alerts">
      <h2 className="font-serif">Game-day alerts</h2>
      <p className="sports-note">
        One note a few hours before the game, and one when it is final. Email needs a confirmation click.
        The Cougar Chronicle is an independent student newspaper and is not affiliated with Brigham Young University.
      </p>
      <form onSubmit={onEmail}>
        <fieldset className="sports-alerts__sports">
          <legend>Sports</legend>
          {SPORTS.map((item) => (
            <label key={item.key}>
              <input
                type="checkbox"
                checked={picked.includes(item.key)}
                onChange={() => toggle(item.key)}
              />
              {' '}
              {item.label}
            </label>
          ))}
        </fieldset>
        <div className="sports-alerts__row">
          {emailOn ? (
            <>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                placeholder="Email"
                aria-label="Email"
                onChange={(event) => setEmail(event.target.value)}
              />
              <button type="submit" disabled={busy !== null}>
                {busy === 'email' ? 'Sending…' : 'Email me'}
              </button>
            </>
          ) : null}
          {pushOn ? (
            <button type="button" onClick={onPush} disabled={busy !== null}>
              {busy === 'push' ? 'Enabling…' : 'Browser alerts'}
            </button>
          ) : null}
        </div>
      </form>
      {message ? <p className="sports-note" role="status">{message}</p> : null}
    </section>
  );
}

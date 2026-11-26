'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ConfirmBody() {
  const token = useSearchParams().get('token') || '';
  const [status, setStatus] = useState<'working' | 'ok' | 'invalid'>(token ? 'working' : 'invalid');

  useEffect(() => {
    if (!token) return;
    let cancel = false;
    fetch('/api/sports/alerts/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (!cancel) setStatus(res.ok ? 'ok' : 'invalid');
      })
      .catch(() => {
        if (!cancel) setStatus('invalid');
      });
    return () => {
      cancel = true;
    };
  }, [token]);

  const text = status === 'working'
    ? 'Confirming your alerts…'
    : status === 'ok'
      ? 'You are confirmed. Game-day alerts will go to this inbox.'
      : 'This confirmation link is invalid or expired.';

  return (
    <div className="container" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
      <article className="team-page">
        <h1 className="font-serif">Game-day alerts</h1>
        <p className="sports-note" role="status">{text}</p>
        <p className="sports-note"><Link href="/sports">Back to sports</Link></p>
      </article>
    </div>
  );
}

export default function ConfirmAlertsPage() {
  return (
    <Suspense fallback={<p className="container sports-note">Confirming your alerts…</p>}>
      <ConfirmBody />
    </Suspense>
  );
}

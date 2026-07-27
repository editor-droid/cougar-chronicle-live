'use client';

import { useState, useTransition } from 'react';
import type { MediaAppearance } from '@/lib/site-content-types';
import { updateMediaAppearancesAction } from '../team-media/actions';

function newId() {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: '0.4rem',
  border: '1px solid var(--border)',
  background: 'var(--background)',
  fontSize: '0.95rem',
};

export default function MediaAppearancesManager({
  initialAppearances,
}: {
  initialAppearances: MediaAppearance[];
}) {
  const [appearances, setAppearances] = useState(initialAppearances);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const save = () => {
    setMessage('');
    startTransition(async () => {
      try {
        await updateMediaAppearancesAction(appearances);
        setMessage('Media appearances saved. Apply page updated.');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Save failed');
      }
    });
  };

  return (
    <div style={{ width: '100%' }}>
      <p className="font-sans text-muted" style={{ marginBottom: '1.25rem', lineHeight: 1.55, maxWidth: '40rem' }}>
        Shown on the Apply page under “See where we&apos;ve shown up.” Add press, podcasts, and national coverage.
        Latest videos stay under Major operations &amp; highlights automatically.
      </p>

      {message && (
        <p
          className="font-sans"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: message.toLowerCase().includes('fail') ? '#fee2e2' : '#ecfdf5',
            color: message.toLowerCase().includes('fail') ? '#991b1b' : '#065f46',
            fontSize: '0.9rem',
          }}
        >
          {message}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
        {appearances.map((item, index) => (
          <div
            key={item.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.55rem',
              padding: '1.1rem',
              border: '1px solid var(--border)',
              borderRadius: '0.55rem',
              background: 'var(--surface)',
            }}
          >
            <input
              style={inputStyle}
              placeholder="Outlet (e.g. Fox News)"
              value={item.outlet}
              onChange={(e) => {
                const next = [...appearances];
                next[index] = { ...item, outlet: e.target.value };
                setAppearances(next);
              }}
            />
            <input
              style={inputStyle}
              placeholder="Headline / title (optional)"
              value={item.title}
              onChange={(e) => {
                const next = [...appearances];
                next[index] = { ...item, title: e.target.value };
                setAppearances(next);
              }}
            />
            <input
              style={{ ...inputStyle, gridColumn: '1 / -1' }}
              placeholder="URL (optional)"
              value={item.url}
              onChange={(e) => {
                const next = [...appearances];
                next[index] = { ...item, url: e.target.value };
                setAppearances(next);
              }}
            />
            <input
              style={{ ...inputStyle, gridColumn: '1 / -1' }}
              placeholder="Short note (optional)"
              value={item.note}
              onChange={(e) => {
                const next = [...appearances];
                next[index] = { ...item, note: e.target.value };
                setAppearances(next);
              }}
            />
            <button
              type="button"
              className="font-sans text-sm"
              style={{
                justifySelf: 'start',
                padding: '0.4rem 0.75rem',
                borderRadius: '0.4rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                cursor: 'pointer',
                color: '#991b1b',
              }}
              onClick={() => setAppearances(appearances.filter((a) => a.id !== item.id))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-secondary font-sans"
          onClick={() =>
            setAppearances([
              ...appearances,
              {
                id: newId(),
                outlet: '',
                title: '',
                url: '',
                note: '',
                sortOrder: appearances.length,
              },
            ])
          }
        >
          Add appearance
        </button>
        <button type="button" className="btn btn-primary font-sans" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : 'Save appearances'}
        </button>
      </div>
    </div>
  );
}

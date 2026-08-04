'use client';

import { useState, useTransition } from 'react';
import type { MediaAppearance } from '@/lib/site-content-types';
import { updateMediaAppearancesAction } from '../team-media/actions';
import { ExternalLink, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { linkPreview } from '@/lib/link-preview';
import YoutubeThumb from '@/components/YoutubeThumb';

function newId() {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const field: import('react').CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.75rem',
  borderRadius: '0.65rem',
  border: '1px solid #e8eaf0',
  background: 'var(--surface-hover)',
  fontSize: '0.95rem',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
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
        setMessage('Appearances saved. Apply page updated.');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Save failed');
      }
    });
  };

  const update = (index: number, patch: Partial<MediaAppearance>) => {
    const next = [...appearances];
    next[index] = { ...next[index], ...patch };
    setAppearances(next);
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="dash-toolbar">
        <p className="font-sans text-muted" style={{ margin: 0, flex: '1 1 280px', lineHeight: 1.55 }}>
          Press, podcasts, and guest spots shown on Apply under “See where we&apos;ve shown up.” Separate from{' '}
          <strong>Videos</strong> (our own uploads). Paste a YouTube URL for a full thumbnail.
        </p>
        <button type="button" className="dash-btn dash-btn-primary" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : 'Save appearances'}
        </button>
      </div>

      {message && (
        <div
          className="font-sans"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            background: /fail|error/i.test(message) ? 'rgba(185,28,28,0.08)' : 'rgba(5,150,105,0.1)',
            color: /fail|error/i.test(message) ? '#991b1b' : '#065f46',
            fontSize: '0.9rem',
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
          gap: '1.15rem',
          width: '100%',
          marginBottom: '1.25rem',
        }}
      >
        {appearances.map((item, index) => {
          const preview = linkPreview(item.url);
          return (
            <article key={item.id} className="dash-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '16 / 9',
                  background: 'linear-gradient(145deg, #1b2253 0%, #3d4a8c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {preview.kind === 'youtube' && preview.videoId ? (
                  <YoutubeThumb videoId={preview.videoId} />
                ) : preview.kind === 'favicon' && preview.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview.src}
                    alt=""
                    width={64}
                    height={64}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 14,
                      background: '#fff',
                      padding: 8,
                      objectFit: 'contain',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    }}
                  />
                ) : (
                  <ImageIcon size={36} color="rgba(255,255,255,0.7)" />
                )}
                {preview.kind === 'youtube' && (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(27,34,83,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </span>
                )}
                {item.outlet ? (
                  <span
                    className="dash-badge"
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 10,
                      background: 'rgba(255,255,255,0.95)',
                      color: '#1B2253',
                      maxWidth: '80%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.outlet}
                  </span>
                ) : null}
              </div>

              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
                <input
                  style={field}
                  placeholder="Outlet (e.g. Fox News)"
                  value={item.outlet}
                  onChange={(e) => update(index, { outlet: e.target.value })}
                />
                <input
                  style={field}
                  placeholder="Headline / title (optional)"
                  value={item.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                />
                <input
                  style={field}
                  placeholder="YouTube or article URL"
                  value={item.url}
                  onChange={(e) => update(index, { url: e.target.value.trim() })}
                />
                <input
                  style={field}
                  placeholder="Short note (optional)"
                  value={item.note}
                  onChange={(e) => update(index, { note: e.target.value })}
                />
                <div className="dash-row-actions" style={{ marginTop: 'auto' }}>
                  {item.url ? (
                    <a
                      href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="dash-btn"
                    >
                      <ExternalLink size={14} /> Open
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="dash-btn"
                    style={{ color: '#b91c1c', marginLeft: 'auto' }}
                    onClick={() => setAppearances(appearances.filter((a) => a.id !== item.id))}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className="dash-btn"
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
        <Plus size={16} /> Add appearance
      </button>
    </div>
  );
}

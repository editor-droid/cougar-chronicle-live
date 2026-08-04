'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Loader2,
  ChevronUp,
  ChevronDown,
  Link2,
} from 'lucide-react';

type Item = {
  id: string;
  label: string;
  url: string;
  emoji: string | null;
  imageUrl: string | null;
  showImage: boolean;
  isActive: boolean;
  sortOrder: number;
  clickCount: number;
  utmCampaign: string | null;
};

export default function LinksManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [showLatestStory, setShowLatestStory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/link-hub');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data.items || []);
      setShowLatestStory(data.showLatestStory !== false);
    } catch {
      toast.error('Could not load link hub');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = async () => {
    if (!newLabel.trim() || !newUrl.trim()) {
      toast.error('Label and URL required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/link-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel.trim(),
          url: newUrl.trim(),
          emoji: newEmoji.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setItems((prev) => [...prev, data.item]);
      setNewLabel('');
      setNewUrl('');
      setNewEmoji('');
      toast.success('Link added');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/link-hub/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setItems((prev) => prev.map((i) => (i.id === id ? data.item : i)));
      return data;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this link?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/link-hub/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(j, 0, row);
    setItems(next);
    const order = next.map((i) => i.id);
    await fetch('/api/link-hub', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
  };

  const toggleLatest = async (on: boolean) => {
    setShowLatestStory(on);
    await fetch('/api/link-hub', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showLatestStory: on }),
    });
  };

  const fetchPreview = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/link-hub/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetchPreview' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No preview found');
      setItems((prev) => prev.map((i) => (i.id === id ? data.item : i)));
      toast.success('Thumbnail pulled from page');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setBusyId(null);
    }
  };

  const uploadCustom = async (id: string, file: File) => {
    setBusyId(id);
    try {
      const prep = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'image/jpeg',
        }),
      });
      const { uploadUrl, publicUrl } = await prep.json();
      if (!prep.ok || !uploadUrl) throw new Error('Upload unavailable');
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });
      if (!put.ok) throw new Error('Upload failed');
      await patch(id, { imageUrl: publicUrl, showImage: true });
      toast.success('Custom image set');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <p className="font-sans text-muted" style={{ padding: '2rem' }}>
        Loading…
      </p>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div className="dash-toolbar">
        <p className="font-sans text-muted" style={{ margin: 0, flex: '1 1 240px', lineHeight: 1.5 }}>
          Public page:{' '}
          <a href="/links" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            /links
          </a>
          {' · '}
          Instagram / bio Linktree. Thumbnails optional.
        </p>
        <label className="dash-pill" style={{ cursor: 'pointer', gap: '0.45rem' }}>
          <input
            type="checkbox"
            checked={showLatestStory}
            onChange={(e) => toggleLatest(e.target.checked)}
          />
          Auto “Latest story”
        </label>
      </div>

      {/* Add link */}
      <div className="dash-card" style={{ padding: '1.15rem 1.25rem', marginBottom: '1.25rem' }}>
        <p
          className="font-sans"
          style={{
            margin: '0 0 0.35rem',
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
          }}
        >
          New link
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.55rem',
            alignItems: 'center',
          }}
        >
          <input
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            placeholder="📰"
            maxLength={8}
            className="font-sans"
            style={{ ...field, width: 56, flex: '0 0 56px' }}
          />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Membership)"
            className="font-sans"
            style={{ ...field, flex: '1 1 160px' }}
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://…"
            className="font-sans"
            style={{ ...field, flex: '2 1 220px' }}
          />
          <button
            type="button"
            onClick={addItem}
            disabled={saving}
            className="dash-btn dash-btn-primary"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add
          </button>
        </div>
      </div>

      {/* Card grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
          gap: '1.15rem',
          width: '100%',
        }}
      >
        {items.map((item, index) => (
          <article
            key={item.id}
            className="dash-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              opacity: item.isActive ? 1 : 0.62,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'relative',
                aspectRatio: '16 / 9',
                background: 'linear-gradient(145deg, #1b2253 0%, #2a3570 100%)',
              }}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: item.showImage ? 1 : 0.45,
                  }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '2.5rem',
                  }}
                >
                  {item.emoji || <Link2 size={36} />}
                </div>
              )}
              <span
                className="dash-badge"
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'rgba(255,255,255,0.95)',
                  color: '#1B2253',
                }}
              >
                {item.clickCount} clicks
              </span>
              {!item.isActive && (
                <span
                  className="dash-badge dash-badge-red"
                  style={{ position: 'absolute', top: 10, left: 10 }}
                >
                  Hidden
                </span>
              )}
            </div>

            <div style={{ padding: '0.95rem 1rem 1.05rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem' }}>{item.emoji || '🔗'}</span>
                <input
                  defaultValue={item.label}
                  onBlur={(e) => {
                    if (e.target.value.trim() !== item.label) {
                      patch(item.id, { label: e.target.value.trim() });
                    }
                  }}
                  className="font-serif"
                  style={{
                    flex: 1,
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    border: '1px solid transparent',
                    background: 'transparent',
                    padding: '0.15rem 0.25rem',
                    borderRadius: 6,
                    minWidth: 0,
                  }}
                />
              </div>
              <input
                defaultValue={item.url}
                onBlur={(e) => {
                  if (e.target.value.trim() !== item.url) {
                    patch(item.id, { url: e.target.value.trim() });
                  }
                }}
                className="font-sans"
                style={{
                  width: '100%',
                  fontSize: '0.78rem',
                  border: '1px solid #e8eaf0',
                  borderRadius: 8,
                  padding: '0.4rem 0.55rem',
                  boxSizing: 'border-box',
                  color: 'var(--muted)',
                  background: '#fafbfd',
                }}
              />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                <label className="dash-pill" style={{ cursor: 'pointer', minHeight: 32, padding: '0.3rem 0.65rem' }}>
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={(e) => patch(item.id, { isActive: e.target.checked })}
                  />
                  Active
                </label>
                <label className="dash-pill" style={{ cursor: 'pointer', minHeight: 32, padding: '0.3rem 0.65rem' }}>
                  <input
                    type="checkbox"
                    checked={item.showImage}
                    disabled={!item.imageUrl}
                    onChange={(e) => patch(item.id, { showImage: e.target.checked })}
                  />
                  Show image
                </label>
              </div>

              <div className="dash-row-actions" style={{ marginTop: 'auto' }}>
                <button
                  type="button"
                  className="dash-btn"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className="dash-btn"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className="dash-btn"
                  disabled={busyId === item.id}
                  onClick={() => fetchPreview(item.id)}
                >
                  {busyId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Thumb
                </button>
                <label className="dash-btn" style={{ cursor: 'pointer' }}>
                  <ImageIcon size={14} />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCustom(item.id, f);
                      e.target.value = '';
                    }}
                  />
                </label>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="dash-btn"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  className="dash-btn"
                  style={{ color: '#b91c1c' }}
                  onClick={() => remove(item.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {items.length === 0 && (
        <div className="dash-empty dash-card" style={{ marginTop: '0.5rem' }}>
          No links yet — add Membership, Donate, Videos, Print Edition, Contact…
        </div>
      )}
    </div>
  );
}

const field: import('react').CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.75rem',
  borderRadius: '0.65rem',
  border: '1px solid #e8eaf0',
  background: 'var(--surface-hover)',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
};

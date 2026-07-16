'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Loader2,
  ChevronUp,
  ChevronDown,
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
    <div style={{ maxWidth: 720 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p className="font-sans text-sm text-muted" style={{ margin: 0 }}>
            Public page:{' '}
            <a href="/links" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
              /links
            </a>
          </p>
        </div>
        <label
          className="font-sans text-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
          }}
        >
          <input
            type="checkbox"
            checked={showLatestStory}
            onChange={(e) => toggleLatest(e.target.checked)}
          />
          Auto “Latest story” card at top
        </label>
      </div>

      {/* Add new */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 className="font-sans" style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
          Add link
        </h2>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="📰"
              style={{ width: 56, padding: '0.55rem', borderRadius: 8, border: '1px solid var(--border)' }}
              maxLength={8}
            />
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. Membership)"
              style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}
            />
          </div>
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://thecougarchronicle.com/membership"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', boxSizing: 'border-box' }}
          />
          <button
            type="button"
            onClick={addItem}
            disabled={saving}
            className="btn btn-primary font-sans"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add
          </button>
        </div>
      </div>

      {/* List */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map((item, index) => (
          <li
            key={item.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              padding: '0.85rem 1rem',
              opacity: item.isActive ? 1 : 0.55,
            }}
          >
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 4 }}>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} style={iconBtn} title="Move up">
                  <ChevronUp size={16} />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} style={iconBtn} title="Move down">
                  <ChevronDown size={16} />
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '1.1rem' }}>{item.emoji || '🔗'}</span>
                  <input
                    defaultValue={item.label}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== item.label) {
                        patch(item.id, { label: e.target.value.trim() });
                      }
                    }}
                    style={{
                      flex: 1,
                      fontWeight: 700,
                      border: '1px solid transparent',
                      background: 'transparent',
                      fontSize: '0.95rem',
                      padding: '0.2rem 0.35rem',
                      borderRadius: 6,
                    }}
                  />
                  <span className="font-sans text-xs text-muted">{item.clickCount} clicks</span>
                </div>
                <input
                  defaultValue={item.url}
                  onBlur={(e) => {
                    if (e.target.value.trim() !== item.url) {
                      patch(item.id, { url: e.target.value.trim() });
                    }
                  }}
                  style={{
                    width: '100%',
                    fontSize: '0.8rem',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '0.35rem 0.5rem',
                    marginBottom: 8,
                    boxSizing: 'border-box',
                    color: 'var(--muted)',
                  }}
                />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <label className="font-sans text-xs" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(e) => patch(item.id, { isActive: e.target.checked })}
                    />
                    Active
                  </label>
                  <label className="font-sans text-xs" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={item.showImage}
                      disabled={!item.imageUrl}
                      onChange={(e) => patch(item.id, { showImage: e.target.checked })}
                    />
                    Show image
                  </label>

                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => fetchPreview(item.id)}
                    className="font-sans text-xs"
                    style={chipBtn}
                    title="Pull thumbnail from linked page (OG image)"
                  >
                    {busyId === item.id ? <Loader2 size={12} /> : <Sparkles size={12} />}
                    Auto thumbnail
                  </button>

                  <label className="font-sans text-xs" style={{ ...chipBtn, cursor: 'pointer' }}>
                    <ImageIcon size={12} />
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

                  {(item.imageUrl || item.showImage) && (
                    <button
                      type="button"
                      onClick={() => patch(item.id, { action: 'clearImage' }).then((d) => d && toast.success('Image removed'))}
                      className="font-sans text-xs"
                      style={chipBtn}
                    >
                      Remove image
                    </button>
                  )}

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-sans text-xs"
                    style={{ ...chipBtn, textDecoration: 'none', color: 'inherit' }}
                  >
                    <ExternalLink size={12} /> Open
                  </a>

                  <button type="button" onClick={() => remove(item.id)} style={{ ...chipBtn, color: '#b91c1c' }}>
                    <Trash2 size={12} />
                  </button>
                </div>

                {item.imageUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        objectFit: 'cover',
                        border: '1px solid var(--border)',
                        opacity: item.showImage ? 1 : 0.4,
                      }}
                    />
                    <span className="font-sans text-xs text-muted">
                      {item.showImage ? 'Visible on /links' : 'Hidden (images off by default until you enable Show image)'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="font-sans text-muted text-sm" style={{ marginTop: '1rem' }}>
          No links yet — add your first above. Suggested: Membership, Donate, Videos, Print Edition, Contact.
        </p>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 2,
  color: 'var(--muted)',
};

const chipBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  border: '1px solid var(--border)',
  background: 'var(--background)',
  borderRadius: 999,
  padding: '0.25rem 0.55rem',
  cursor: 'pointer',
  fontWeight: 600,
};

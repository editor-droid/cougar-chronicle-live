'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus, Upload, Link2, X, Loader2, Sparkles } from 'lucide-react';
import styles from './VideosAdmin.module.css';

export type AdminVideo = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoKeywords: string | null;
  platform: 'STREAM' | 'YOUTUBE';
  thumbnailUrl: string | null;
  isActive: boolean;
  showOnHome: boolean;
  showInSidebar: boolean;
  publishedAt: string;
  embedUrl: string;
  sourceUrl: string | null;
  durationSec: number | null;
};

const MAX_FILE_MB = 200;

function formatDurationInput(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideosManager({
  initialVideos,
  streamConfigured,
}: {
  initialVideos: AdminVideo[];
  streamConfigured: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [mode, setMode] = useState<'youtube' | 'stream'>('youtube');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [showOnHome, setShowOnHome] = useState(true);
  const [showInSidebar, setShowInSidebar] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editKeywords, setEditKeywords] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editHome, setEditHome] = useState(true);
  const [editSidebar, setEditSidebar] = useState(true);
  const [editAiLoading, setEditAiLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdminVideo | null>(null);

  const closePreview = useCallback(() => setPreview(null), []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [preview, closePreview]);

  const resetComposer = () => {
    setTitle('');
    setDescription('');
    setSeoKeywords('');
    setDurationInput('');
    setYoutubeUrl('');
    setFile(null);
    setShowOnHome(true);
    setShowInSidebar(true);
    setStatus('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const runAiSeo = async (opts?: {
    forEdit?: boolean;
  }) => {
    const t = opts?.forEdit ? editTitle : title;
    if (!t.trim()) {
      setError('Add a title first, then run AI');
      return;
    }
    if (opts?.forEdit) setEditAiLoading(true);
    else setIsAiLoading(true);
    setError('');
    try {
      const res = await fetch('/api/videos/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: t.trim(),
          platform: mode === 'youtube' ? 'YOUTUBE' : 'STREAM',
          youtubeUrl: mode === 'youtube' ? youtubeUrl : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI failed');
      if (opts?.forEdit) {
        setEditDescription(data.description || '');
        setEditKeywords(data.seoKeywords || '');
      } else {
        setDescription(data.description || '');
        setSeoKeywords(data.seoKeywords || '');
      }
    } catch (e) {
      setError((e as Error).message || 'AI failed');
    } finally {
      if (opts?.forEdit) setEditAiLoading(false);
      else setIsAiLoading(false);
    }
  };

  const publish = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      if (!title.trim()) throw new Error('Title is required');

      // Auto AI if description empty — server also does this; run client-side for visible feedback
      let finalDescription = description.trim();
      let finalKeywords = seoKeywords.trim();
      let finalSeoTitle: string | undefined;

      if (!finalDescription || !finalKeywords) {
        setStatus('Writing SEO with AI…');
        try {
          const res = await fetch('/api/videos/seo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title.trim(),
              platform: mode === 'youtube' ? 'YOUTUBE' : 'STREAM',
              youtubeUrl: mode === 'youtube' ? youtubeUrl : undefined,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            if (!finalDescription) finalDescription = data.description || '';
            if (!finalKeywords) finalKeywords = data.seoKeywords || '';
            finalSeoTitle = data.seoTitle;
            setDescription(finalDescription);
            setSeoKeywords(finalKeywords);
          }
        } catch {
          /* server will retry */
        }
      }

      if (mode === 'youtube') {
        if (!youtubeUrl.trim()) throw new Error('Paste a YouTube link');
        setStatus('Publishing…');
        const res = await fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'YOUTUBE',
            title: title.trim(),
            description: finalDescription || null,
            seoKeywords: finalKeywords || null,
            seoTitle: finalSeoTitle || null,
            youtubeUrl,
            durationSec: durationInput || null,
            showOnHome,
            showInSidebar,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');
      } else {
        if (!file) throw new Error('Choose a video file');
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          throw new Error(`File must be under ${MAX_FILE_MB} MB`);
        }
        if (!streamConfigured) {
          throw new Error('Stream is not configured (CLOUDFLARE_API_TOKEN)');
        }

        setStatus('Preparing upload…');
        const setupRes = await fetch('/api/videos/stream-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxDurationSeconds: 180, name: title.trim() }),
        });
        const setup = await setupRes.json();
        if (!setupRes.ok) throw new Error(setup.error || 'Upload unavailable');

        setStatus('Uploading…');
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch(setup.uploadURL, { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error('Upload failed');

        setStatus('Publishing…');
        const res = await fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'STREAM',
            title: title.trim(),
            description: finalDescription || null,
            seoKeywords: finalKeywords || null,
            seoTitle: finalSeoTitle || null,
            externalId: setup.uid,
            durationSec: durationInput || null,
            showOnHome,
            showInSidebar,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save');
      }

      resetComposer();
      setComposerOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message || 'Something went wrong');
      setStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (v: AdminVideo) => {
    setEditingId(v.id);
    setEditTitle(v.title);
    setEditDescription(v.description || '');
    setEditKeywords(v.seoKeywords || '');
    setEditDuration(formatDurationInput(v.durationSec));
    setEditHome(v.showOnHome);
    setEditSidebar(v.showInSidebar);
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          seoKeywords: editKeywords.trim() || null,
          durationSec: editDuration || null,
          showOnHome: editHome,
          showInSidebar: editSidebar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setEditingId(null);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (v: AdminVideo) => {
    if (!confirm(`Remove “${v.title}”?`)) return;
    setBusyId(v.id);
    try {
      const res = await fetch(`/api/videos/${v.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      if (editingId === v.id) setEditingId(null);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.headerTitle}>Videos</h2>
          <span className={styles.countBadge}>{initialVideos.length}</span>
        </div>
        <div className={styles.headerRight}>
          {composerOpen ? (
            <>
              <button
                type="button"
                className={styles.headerButton}
                onClick={() => {
                  setComposerOpen(false);
                  resetComposer();
                }}
                disabled={isSubmitting}
              >
                <X size={16} /> <span className={styles.hideOnNarrow}>Cancel</span>
              </button>
              <button
                type="button"
                className={`${styles.headerButton} ${styles.btnPublish}`}
                onClick={publish}
                disabled={isSubmitting || isAiLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span className={styles.hideOnNarrow}>{status || 'Working…'}</span>
                  </>
                ) : (
                  'Publish'
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`${styles.headerButton} ${styles.btnPrimary}`}
              onClick={() => setComposerOpen(true)}
            >
              <Plus size={16} /> New Video
            </button>
          )}
        </div>
      </header>

      {composerOpen && (
        <section className={styles.composer}>
          <p className={styles.hint}>
            Title + link or file → Publish. AI writes description & keywords if you skip them.
          </p>

          <input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video title…"
            autoFocus
            autoComplete="off"
          />

          <p className={styles.sectionLabel}>Source</p>
          <div className={styles.modeTabs}>
            <button
              type="button"
              className={`${styles.modeTab} ${mode === 'youtube' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('youtube')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Link2 size={14} /> YouTube
              </span>
            </button>
            <button
              type="button"
              className={`${styles.modeTab} ${mode === 'stream' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('stream')}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Upload size={14} /> Upload
              </span>
            </button>
          </div>

          {mode === 'youtube' ? (
            <input
              className={styles.fieldInput}
              type="url"
              inputMode="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube or Shorts link"
              autoComplete="off"
            />
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button type="button" className={styles.fileDrop} onClick={() => fileRef.current?.click()}>
                <strong>{file ? file.name : 'Tap to choose or record video'}</strong>
                <span>
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : `MP4 · max ${MAX_FILE_MB} MB`}
                </span>
              </button>
              {!streamConfigured && (
                <p className={styles.error} style={{ marginTop: '-0.35rem' }}>
                  Add CLOUDFLARE_API_TOKEN for uploads. YouTube works now.
                </p>
              )}
            </>
          )}

          <div className={styles.seoRow}>
            <div className={styles.seoLabelRow}>
              <p className={styles.sectionLabel} style={{ margin: 0 }}>
                Description
              </p>
              <button
                type="button"
                className={styles.aiButton}
                onClick={() => runAiSeo()}
                disabled={isAiLoading || isSubmitting || !title.trim()}
              >
                {isAiLoading ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Sparkles size={14} />
                )}
                AI fill
              </button>
            </div>
            <textarea
              className={styles.descInput}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — leave blank and AI fills on publish"
              rows={2}
            />
          </div>

          <label className={styles.fieldBlock}>
            <span className={styles.sectionLabel}>Keywords</span>
            <input
              className={styles.fieldInput}
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="Optional — comma-separated; AI fills if blank"
              autoComplete="off"
            />
          </label>

          <label className={styles.fieldBlock}>
            <span className={styles.sectionLabel}>Duration (optional)</span>
            <input
              className={styles.fieldInput}
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              placeholder="1:30 or seconds"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>

          <p className={styles.sectionLabel}>Show on</p>
          <div className={styles.toggleRow}>
            <label className={`${styles.toggleChip} ${showOnHome ? styles.toggleChipOn : ''}`}>
              <input type="checkbox" checked={showOnHome} onChange={(e) => setShowOnHome(e.target.checked)} />
              Homepage
            </label>
            <label className={`${styles.toggleChip} ${showInSidebar ? styles.toggleChipOn : ''}`}>
              <input
                type="checkbox"
                checked={showInSidebar}
                onChange={(e) => setShowInSidebar(e.target.checked)}
              />
              Sidebar
            </label>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {status && !error && <p className={styles.status}>{status}</p>}

          <div className={styles.composerActions}>
            <button
              type="button"
              className={`${styles.headerButton} ${styles.btnPublish} ${styles.publishWide}`}
              onClick={publish}
              disabled={isSubmitting || isAiLoading}
            >
              {isSubmitting ? status || 'Publishing…' : 'Publish video'}
            </button>
          </div>
        </section>
      )}

      <div className={styles.sectionHead}>
        <h2>Library</h2>
      </div>

      <div className={styles.grid}>
        {initialVideos.length === 0 && (
          <div className={styles.empty}>
            <h3>No videos yet</h3>
            <p>Tap New Video — title, link, publish.</p>
          </div>
        )}

        {initialVideos.map((v) => {
          const isEditing = editingId === v.id;
          return (
            <article key={v.id} className={`${styles.card} ${!v.isActive ? styles.cardHidden : ''}`}>
              <div
                className={styles.thumbWrap}
                onClick={() => setPreview(v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setPreview(v);
                }}
              >
                {v.thumbnailUrl ? (
                  <Image src={v.thumbnailUrl} alt="" fill sizes="320px" style={{ objectFit: 'cover' }} unoptimized />
                ) : null}
                <span className={styles.badge}>{v.platform === 'STREAM' ? 'Upload' : 'YouTube'}</span>
                {!v.isActive && <span className={`${styles.badge} ${styles.badgeHidden}`}>Hidden</span>}
                <div className={styles.thumbPlay}>
                  <span className={styles.playDot}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--primary)">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{v.title}</h3>
                <div className={styles.cardMeta}>
                  <a
                    href={`/videos/${v.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.metaChip}
                    style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    /videos/{v.slug}
                  </a>
                  {v.durationSec != null && (
                    <span className={styles.metaChip}>{formatDurationInput(v.durationSec)}</span>
                  )}
                  <span className={`${styles.metaChip} ${v.showOnHome ? styles.metaOn : styles.metaOff}`}>
                    Home {v.showOnHome ? '✓' : '—'}
                  </span>
                  <span className={`${styles.metaChip} ${v.showInSidebar ? styles.metaOn : styles.metaOff}`}>
                    Sidebar {v.showInSidebar ? '✓' : '—'}
                  </span>
                </div>
                {v.seoKeywords && (
                  <p className={styles.keywordsPreview}>{v.seoKeywords}</p>
                )}

                {!isEditing && (
                  <div className={styles.cardActions}>
                    <button type="button" className={`${styles.cardButton} ${styles.cardButtonPrimary}`} onClick={() => startEdit(v)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.cardButton}
                      disabled={busyId === v.id}
                      onClick={() => patch(v.id, { isActive: !v.isActive })}
                    >
                      {v.isActive ? 'Hide' : 'Show'}
                    </button>
                    <a
                      href={`/videos/${v.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.cardButton}
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      className={`${styles.cardButton} ${styles.cardButtonDanger}`}
                      disabled={busyId === v.id}
                      onClick={() => remove(v)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className={styles.editPanel}>
                  <div>
                    <div className={styles.editLabel}>Title</div>
                    <input className={styles.fieldInput} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div>
                    <div className={styles.seoLabelRow}>
                      <div className={styles.editLabel}>Description</div>
                      <button
                        type="button"
                        className={styles.aiButton}
                        disabled={editAiLoading || !editTitle.trim()}
                        onClick={async () => {
                          setEditAiLoading(true);
                          try {
                            const res = await fetch('/api/videos/seo', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                title: editTitle.trim(),
                                platform: v.platform,
                                youtubeUrl: v.sourceUrl || undefined,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'AI failed');
                            setEditDescription(data.description || '');
                            setEditKeywords(data.seoKeywords || '');
                          } catch (e) {
                            alert((e as Error).message);
                          } finally {
                            setEditAiLoading(false);
                          }
                        }}
                      >
                        {editAiLoading ? (
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        AI
                      </button>
                    </div>
                    <textarea
                      className={styles.descInput}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div>
                    <div className={styles.editLabel}>Keywords</div>
                    <input className={styles.fieldInput} value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)} />
                  </div>
                  <div>
                    <div className={styles.editLabel}>Duration</div>
                    <input
                      className={styles.fieldInput}
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      placeholder="1:30"
                    />
                  </div>
                  <div className={styles.toggleRow}>
                    <label className={`${styles.toggleChip} ${editHome ? styles.toggleChipOn : ''}`}>
                      <input type="checkbox" checked={editHome} onChange={(e) => setEditHome(e.target.checked)} />
                      Homepage
                    </label>
                    <label className={`${styles.toggleChip} ${editSidebar ? styles.toggleChipOn : ''}`}>
                      <input
                        type="checkbox"
                        checked={editSidebar}
                        onChange={(e) => setEditSidebar(e.target.checked)}
                      />
                      Sidebar
                    </label>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={`${styles.cardButton} ${styles.cardButtonPrimary}`}
                      disabled={busyId === v.id || !editTitle.trim()}
                      onClick={() => saveEdit(v.id)}
                    >
                      {busyId === v.id ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className={styles.cardButton} onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {preview && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" onClick={closePreview}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalBar}>
              <span>{preview.title}</span>
              <button type="button" onClick={closePreview}>
                Close
              </button>
            </div>
            <div className={styles.modalFrame}>
              <iframe
                src={`${preview.embedUrl}${preview.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
                title={preview.title}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

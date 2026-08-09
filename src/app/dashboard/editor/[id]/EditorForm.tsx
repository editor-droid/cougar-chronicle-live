'use client';

import { useState, useRef } from 'react';
import { RichTextEditor, RichTextEditorHandle } from '@/components/RichTextEditor';
import { SeoAnalysisPanel } from '@/components/SeoAnalysisPanel';
import { AiSpellcheckPanel } from '@/components/AiSpellcheckPanel';
import { savePost, updatePostState, addEditorialNote } from '../../actions';
import { useRouter } from 'next/navigation';
import { FileDown, Loader2, X, Settings, Image as ImageIcon, CheckCircle2, PanelRightClose, PanelRightOpen, ArrowLeft, Wand2, ListChecks, Eye } from 'lucide-react';
import styles from './EditorForm.module.css';
import { sanitizeSlugInput, slugifyTitle, assessSlug } from '@/lib/slug';

type ChecklistKey = 'spellcheck' | 'seo' | 'formatting' | 'oneWordLinks' | 'ready';

type ChecklistState = Record<ChecklistKey, boolean>;

const DEFAULT_CHECKLIST: ChecklistState = {
  spellcheck: false,
  seo: false,
  formatting: false,
  oneWordLinks: false,
  ready: false,
};

const CHECKLIST_ITEMS: {
  key: ChecklistKey;
  title: string;
  hint: string;
  step: string;
}[] = [
  {
    key: 'spellcheck',
    title: 'Spellcheck & AI review',
    hint: 'Run AI spellcheck and accept or reject suggested edits',
    step: '01',
  },
  {
    key: 'seo',
    title: 'SEO complete',
    hint: 'Title, description, keywords, and image alt filled in',
    step: '02',
  },
  {
    key: 'formatting',
    title: 'Formatting polish',
    hint: 'Headings, spacing, and layout look professional',
    step: '03',
  },
  {
    key: 'oneWordLinks',
    title: 'Link text is clean',
    hint: 'Links use a short, clear phrase — not full sentences',
    step: '04',
  },
  {
    key: 'ready',
    title: 'Ready for editor',
    hint: 'Story is ready to submit or publish',
    step: '05',
  },
];

const PUBLISH_FLOW_STATES = new Set(['IN_REVIEW', 'APPROVED', 'PUBLISHED']);

function parseChecklist(raw: unknown): ChecklistState {
  if (!raw) return { ...DEFAULT_CHECKLIST };
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...DEFAULT_CHECKLIST, ...o };
  } catch {
    return { ...DEFAULT_CHECKLIST };
  }
}

function isChecklistComplete(c: ChecklistState): boolean {
  return CHECKLIST_ITEMS.every((item) => !!c[item.key]);
}

function incompleteChecklistLabels(c: ChecklistState): string[] {
  return CHECKLIST_ITEMS.filter((item) => !c[item.key]).map((item) => item.title);
}

type PrintEditionOption = { id: string; title: string; isActive: boolean };

export default function EditorForm({
  post,
  authorId,
  userRole,
  availableAuthors = [],
  customAuthorsList = [],
  printEditions = [],
  isNew = false,
}: {
  post: any;
  authorId: string;
  userRole: string;
  availableAuthors?: any[];
  customAuthorsList?: string[];
  printEditions?: PrintEditionOption[];
  isNew?: boolean;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('settings');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [checklist, setChecklist] = useState<ChecklistState>(() => parseChecklist(post?.editorChecklist));
  const [checklistGate, setChecklistGate] = useState(false);
  const [checklistAiNotes, setChecklistAiNotes] = useState<
    Partial<Record<ChecklistKey, { pass: boolean; note: string }>>
  >({});
  const [isReviewingChecklist, setIsReviewingChecklist] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null); 

  const [title, setTitle] = useState(post?.title || '');
  const [category, setCategory] = useState(
    ['campus', 'politics', 'family', 'faith'].includes(post?.category || '')
      ? post!.category
      : 'campus'
  );
  const [format, setFormat] = useState<'news' | 'opinion'>(
    post?.format === 'opinion' ? 'opinion' : 'news'
  );
  const [slug, setSlug] = useState(post?.slug || '');
  /** Once the user edits the slug field, stop auto-syncing from title. */
  const [slugLocked, setSlugLocked] = useState(Boolean(post?.slug));
  const [imageUrl, setImageUrl] = useState(post?.imageUrl || '');
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription || '');
  const [seoKeywords, setSeoKeywords] = useState(post?.seoKeywords || '');
  const [featuredImageAlt, setFeaturedImageAlt] = useState(post?.featuredImageAlt || '');
  
  const [customAuthor, setCustomAuthor] = useState(post?.customAuthor || '');
  const [isPremium, setIsPremium] = useState(post?.isPremium || false);
  // Default on; only false when explicitly disabled on the post
  const [showDonateCta, setShowDonateCta] = useState(post?.showDonateCta !== false);
  const [keyInsights, setKeyInsights] = useState(post?.keyInsights || '');
  const [assignedAuthorId, setAssignedAuthorId] = useState(post?.authorId || authorId);
  const [printEditionId, setPrintEditionId] = useState(post?.printEditionId || '');
  const [printEditionOrder, setPrintEditionOrder] = useState(post?.printEditionOrder?.toString() || '');
  const [imageCaption, setImageCaption] = useState(post?.imageCaption || '');
  const [isAmerica250, setIsAmerica250] = useState(post?.isAmerica250 || false);
  const [isBreaking, setIsBreaking] = useState(post?.isBreaking || false);
  const [breakingHours, setBreakingHours] = useState<number | ''>(24);
  const [publishedAt, setPublishedAt] = useState(() => {
    if (post?.publishedAt) {
      const d = new Date(post.publishedAt);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    return '';
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [isUploadingFeatured, setIsUploadingFeatured] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const featuredFileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState(post?.content || '<p>Start writing your story here...</p>');
  const [focusKeyword, setFocusKeyword] = useState(post?.seoKeywords?.split(',')[0] || '');
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImportDoc = async () => {
    if (!importUrl) return alert("Please enter a Google Doc URL");
    setImporting(true);
    try {
      const res = await fetch('/api/docs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      if (result.success && result.data) {
        if (result.data.title) setTitle(result.data.title);
        if (result.data.slug) setSlug(result.data.slug);
        if (result.data.content) {
          setContent(result.data.content);
          if (editorRef.current) {
             editorRef.current.getEditor()?.commands.setContent(result.data.content);
          }
        }
        if (result.data.category) setCategory(result.data.category);
        if (result.data.format === 'opinion' || result.data.format === 'news') {
          setFormat(result.data.format);
        }
        if (result.data.imageUrl) setImageUrl(result.data.imageUrl);
        if (result.data.featuredImageAlt) setFeaturedImageAlt(result.data.featuredImageAlt);
        if (result.data.seoTitle) setSeoTitle(result.data.seoTitle);
        if (result.data.seoDescription) setSeoDescription(result.data.seoDescription);
        if (result.data.seoKeywords) setSeoKeywords(result.data.seoKeywords);
        if (result.data.keyInsights) setKeyInsights(result.data.keyInsights);
        if (result.data.customAuthor) setCustomAuthor(result.data.customAuthor);
        
        setShowImportModal(false);
        setImportUrl("");
        alert("Successfully imported from Google Docs!");
      }
    } catch(err: any) {
      alert(err.message || "Failed to import from Google Docs");
    } finally {
      setImporting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      if (!response.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await response.json();
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!uploadRes.ok) throw new Error('Failed to upload file to storage');
      if (editorRef.current) {
        editorRef.current.insertImage(publicUrl);
      }
    } catch (err) {
      console.error('Failed to upload image', err);
      alert('Failed to upload image to Cloudflare R2.');
    }
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingFeatured(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      if (!response.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await response.json();
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!uploadRes.ok) throw new Error('Failed to upload file to storage');
      setImageUrl(publicUrl);
    } catch (err) {
      console.error('Failed to upload featured image', err);
      alert('Failed to upload featured image to Cloudflare R2.');
    } finally {
      setIsUploadingFeatured(false);
      if (featuredFileInputRef.current) featuredFileInputRef.current.value = '';
    }
  };

  const generateSlug = async () => {
    if (!title && !content) return alert('Add a title or content first');
    setIsGeneratingSlug(true);
    try {
      const res = await fetch('/api/seo/slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      const data = await res.json();
      if (data.slug) {
        setSlug(data.slug);
        setSlugLocked(true);
      } else {
        alert(data.error || 'Failed to generate slug');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate slug');
    } finally {
      setIsGeneratingSlug(false);
    }
  };

  const slugQuality = assessSlug(slug);

  const generateSEO = async () => {
    if (!content || content === '<p></p>') {
      alert('Please write some content before generating SEO metadata.');
      return;
    }
    setIsGeneratingSEO(true);
    try {
      const response = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate SEO');
      }
      setSeoTitle(data.seoTitle || '');
      setSeoDescription(data.seoDescription || '');
      setSeoKeywords(data.seoKeywords || '');
      setFeaturedImageAlt(data.featuredImageAlt || '');
      if (data.keyInsights) setKeyInsights(data.keyInsights);
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to generate SEO metadata. Please try again.'
      );
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const openChecklistGate = () => {
    setChecklistGate(true);
    setSidebarOpen(true);
    setActiveTab('checklist');
  };

  const runAiChecklistReview = async () => {
    setIsReviewingChecklist(true);
    try {
      const res = await fetch('/api/checklist-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          seoTitle,
          seoDescription,
          seoKeywords,
          featuredImageAlt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'AI checklist review failed');

      const checks = (data.checks || {}) as Partial<
        Record<ChecklistKey, { pass: boolean; note: string }>
      >;
      setChecklistAiNotes(checks);

      const next: ChecklistState = { ...checklist };
      for (const item of CHECKLIST_ITEMS) {
        const result = checks[item.key];
        if (result?.pass) next[item.key] = true;
      }
      // Local SEO field check can also pass even if model is cautious
      if (
        seoTitle?.trim() &&
        seoDescription?.trim() &&
        seoKeywords?.trim() &&
        featuredImageAlt?.trim()
      ) {
        next.seo = true;
      }
      setChecklist(next);
      if (isChecklistComplete(next)) setChecklistGate(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'AI checklist review failed');
    } finally {
      setIsReviewingChecklist(false);
    }
  };

  const handleSaveData = async (newState?: string) => {
    // Gate submit / approve / publish on a complete checklist
    if (newState && PUBLISH_FLOW_STATES.has(newState) && !isChecklistComplete(checklist)) {
      openChecklistGate();
      return;
    }

    setIsSubmitting(true);
    try {
      await savePost({
        id: post?.id,
        title, slug, category, format, content, imageUrl, authorId: assignedAuthorId,
        seoTitle, seoDescription, seoKeywords,
        keyInsights, featuredImageAlt, customAuthor, isPremium,
        showDonateCta,
        isAmerica250, isBreaking, breakingHours: isBreaking ? breakingHours || 24 : null,
        printEditionId: printEditionId || null,
        printEditionOrder, imageCaption,
        editorChecklist: checklist,
        publishedAt: publishedAt || undefined
      });

      if (newState && post?.id) {
        const fd = new FormData();
        fd.append('postId', post.id);
        fd.append('newState', newState);
        await updatePostState(fd);
      }

      setChecklistGate(false);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (/checklist/i.test(msg)) {
        openChecklistGate();
      } else {
        alert(msg || 'Failed to save post. Slug might already be in use.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    await handleSaveData();
  };

  // Toggle Switch Component
  const ToggleSwitch = ({ checked, onChange, label, description }: any) => (
    <div className={styles.toggleSwitch} onClick={() => onChange(!checked)}>
      <div className={styles.toggleTrack} style={{ backgroundColor: checked ? 'var(--primary)' : '#e5e7eb' }}>
        <span className={styles.toggleThumb} style={{ transform: checked ? 'translateX(1rem)' : 'translateX(0)' }} />
      </div>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{label}</div>
        {description && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{description}</div>}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Import Modal */}
      {showImportModal && (
         <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button onClick={() => setShowImportModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}>
              <X size={16} />
            </button>
            <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111827' }}>
              <FileDown size={20} color="var(--primary)" />
              Import Google Doc
            </h3>
            <p className="font-sans" style={{ fontSize: '0.875rem', marginBottom: '1.5rem', color: '#6b7280' }}>
              Paste your Google Doc URL below. <strong style={{ color: 'var(--primary)' }}>Important:</strong> The document must be set to "Anyone with the link can view".
            </p>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="https://docs.google.com/document/d/..."
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                className={styles.textInput}
                style={{ flex: 1, backgroundColor: '#f9fafb' }}
              />
              <button
                onClick={handleImportDoc}
                disabled={importing || !importUrl.trim()}
                className="btn btn-primary font-sans"
                type="button"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '0.75rem' }}
              >
                {importing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={16} />}
                {importing ? "Importing..." : "Run"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.leftColumn}>
        <h1 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#111827' }}>
          {isNew ? 'Create New Draft' : 'Edit Post'}
        </h1>
        {/* Status / actions bar (scrolls with page — not sticky) */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button type="button" onClick={() => router.push('/dashboard')} className={styles.headerButton}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</span>
            <div className={styles.statusBadge}>
              <span className={styles.statusDot} style={{ backgroundColor: post?.state === 'PUBLISHED' ? '#22c55e' : post?.state === 'IN_REVIEW' ? '#eab308' : '#d1d5db' }}></span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{post?.state || 'DRAFT'}</span>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button type="button" onClick={() => setShowImportModal(true)} className={`${styles.headerButton} ${styles.btnSave}`}>
            <FileDown size={16} /> Import Doc
          </button>
          
          <button type="button" disabled={isSubmitting} onClick={handleSubmit} className={`${styles.headerButton} ${styles.btnSave}`}>
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </button>

          {/* Workflow: writers submit → editors approve → admins publish */}
          {userRole === 'WRITER' && (!post || post.state === 'DRAFT') && (
             <button type="button" onClick={() => handleSaveData('IN_REVIEW')} disabled={isSubmitting} className={`${styles.headerButton} ${styles.btnSubmit}`}>
               Submit for Review
             </button>
          )}
          {(userRole === 'EDITOR' || userRole === 'ADMIN') && post?.state === 'IN_REVIEW' && (
             <button type="button" onClick={() => handleSaveData('APPROVED')} disabled={isSubmitting} className={`${styles.headerButton} ${styles.btnSubmit}`}>
               Approve Draft
             </button>
          )}
          {/* Editors may mark scheduled time via Approve when a future publish date is set */}
          {userRole === 'EDITOR' && post?.state !== 'PUBLISHED' && post?.state !== 'IN_REVIEW' && publishedAt && new Date(publishedAt) > new Date() && (
             <button type="button" onClick={() => handleSaveData('APPROVED')} disabled={isSubmitting} className={`${styles.headerButton} ${styles.btnSubmit}`}>
               Save as Scheduled
             </button>
          )}
          {userRole === 'ADMIN' && post?.state !== 'PUBLISHED' && (
             <button type="button" onClick={() => handleSaveData(publishedAt && new Date(publishedAt) > new Date() ? 'APPROVED' : 'PUBLISHED')} disabled={isSubmitting} className={`${styles.headerButton} ${styles.btnPublish}`}>
               {publishedAt && new Date(publishedAt) > new Date() ? 'Schedule' : 'Publish Live'}
             </button>
          )}

          <div style={{ width: '1px', height: '1.5rem', backgroundColor: '#e5e7eb', margin: '0 0.25rem' }}></div>
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className={styles.headerButton} style={{ padding: '0.5rem', color: sidebarOpen ? 'var(--primary)' : '#6b7280', backgroundColor: sidebarOpen ? 'rgba(27,34,83,0.1)' : 'transparent' }}>
            {sidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
          </button>
        </div>
      </header>

      {/* Main Editor Content Area */}
      <main className={styles.editorContent}>
          {userRole === 'WRITER' && post?.editorialNotes?.some((n: any) => !n.resolved) && (
            <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', color: '#991b1b', fontWeight: 600 }}>
              ⚠️ An editor has requested changes. Please review the notes in the sidebar.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => {
                  const t = e.target.value;
                  setTitle(t);
                  if (!slugLocked) {
                    setSlug(slugifyTitle(t, { dropStopWords: true }));
                  }
                }} 
                placeholder="Article Title..." 
                required 
                className={styles.titleInput}
              />

              <textarea 
                value={keyInsights} 
                onChange={(e) => setKeyInsights(e.target.value)} 
                placeholder="Key Insights / Takeaways (Optional)"
                className={styles.insightsInput}
              />

              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary font-sans text-sm"
                    onClick={() => setViewMode('edit')}
                    style={{
                      opacity: viewMode === 'edit' ? 1 : 0.7,
                      borderColor: viewMode === 'edit' ? 'var(--primary)' : undefined,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary font-sans text-sm"
                    onClick={() => setViewMode('preview')}
                    style={{
                      opacity: viewMode === 'preview' ? 1 : 0.7,
                      borderColor: viewMode === 'preview' ? 'var(--primary)' : undefined,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Eye size={14} /> Preview
                  </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />
                <input
                  type="file"
                  ref={galleryInputRef}
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files?.length) return;
                    const images: { src: string; alt: string }[] = [];
                    for (const file of Array.from(files)) {
                      const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: file.name, contentType: file.type }),
                      });
                      const data = await res.json();
                      if (!res.ok) continue;
                      await fetch(data.uploadUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': file.type },
                        body: file,
                      });
                      images.push({ src: data.publicUrl, alt: file.name });
                    }
                    if (images.length) {
                      const ed = editorRef.current?.getEditor();
                      // Gallery extension command
                      (ed?.commands as { insertGallery?: (imgs: typeof images, cols: number) => boolean })
                        ?.insertGallery?.(images, Math.min(3, Math.max(2, images.length > 2 ? 3 : 2)));
                    }
                    e.target.value = '';
                  }}
                />
                <RichTextEditor
                  ref={editorRef}
                  value={content}
                  onChange={setContent}
                  onImageInsert={() => fileInputRef.current?.click()}
                  onGalleryInsert={() => galleryInputRef.current?.click()}
                  viewMode={viewMode}
                />
              </div>
          </form>
        </main>
      </div>

      {/* Slide-out Sidebar */}
      <div className={`${styles.sidebarWrapper} ${!sidebarOpen ? styles.sidebarClosed : ''}`}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTabs}>
            {[
              { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
              { id: 'seo', label: 'SEO', icon: <CheckCircle2 size={16} /> },
              { id: 'spellcheck', label: 'AI Edits', icon: <Wand2 size={16} /> },
              { id: 'checklist', label: 'Checklist', icon: <ListChecks size={16} /> },
              { id: 'notes', label: 'Notes', icon: <FileDown size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.sidebarContent}>
            {/* Always visible at top of editor sidebar — not buried in flags */}
            <div className={styles.panelCard} style={{ marginBottom: 0 }}>
              <ToggleSwitch
                checked={showDonateCta}
                onChange={setShowDonateCta}
                label="Ask for donations"
                description="Show donate blurbs on this article. On by default; turn off for sensitive stories."
              />
            </div>

            {activeTab === 'settings' && (
              <div className={styles.panelRoot}>
                <div className={`${styles.panelHero} ${styles.panelHeroNavy}`}>
                  <p className={styles.panelKicker}>Article</p>
                  <h3 className={styles.panelHeroTitle}>Story settings</h3>
                  <p className={styles.panelHeroHint}>
                    Cover image, URL, authors, publish time, and print edition.
                  </p>
                </div>

                <div className={styles.panelCard}>
                  <div className={styles.panelCardHeader}>
                    <p className={styles.panelCardTitle}>Cover & flags</p>
                    <div className={styles.flagRow}>
                      <button type="button" title="Require a subscription or lifetime purchase to read." onClick={() => setIsPremium(!isPremium)} className={`${styles.pillToggle} ${isPremium ? styles.pillActive : ''}`}>★ Premium</button>
                      <button type="button" title="Feature this in the America 250 collection." onClick={() => setIsAmerica250(!isAmerica250)} className={`${styles.pillToggle} ${isAmerica250 ? styles.pillActive : ''}`}>🇺🇸 America 250</button>
                      <button type="button" title="Pin as breaking news (banner + push)." onClick={() => setIsBreaking(!isBreaking)} className={`${styles.pillToggle} ${isBreaking ? styles.pillActive : ''}`}>⚡ Breaking</button>
                      {isBreaking && (
                        <select
                          value={breakingHours === '' ? 24 : breakingHours}
                          onChange={(e) => setBreakingHours(Number(e.target.value))}
                          className="font-sans text-sm"
                          style={{ padding: '0.25rem 0.4rem', borderRadius: '0.35rem', border: '1px solid var(--border)' }}
                          title="How long to keep the breaking banner"
                        >
                          <option value={12}>12 hours</option>
                          <option value={24}>24 hours</option>
                          <option value={48}>48 hours</option>
                          <option value={72}>72 hours</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div className={styles.imageUploadZone} onClick={() => featuredFileInputRef.current?.click()}>
                    {imageUrl ? (
                      <div className={styles.imagePreview}>
                        <img src={imageUrl} alt="Featured" />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', padding: '1.5rem 0' }}>
                        <ImageIcon size={32} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Click to upload cover image</span>
                      </div>
                    )}
                    <input type="file" ref={featuredFileInputRef} onChange={handleFeaturedImageUpload} accept="image/*" style={{ display: 'none' }} />
                  </div>
                  <input
                    type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Or paste image URL..."
                    className={styles.textInput}
                  />
                  <input
                    type="text" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="Image caption / credit"
                    className={styles.textInput}
                  />
                </div>

                <div className={styles.panelCard}>
                  <p className={styles.panelCardTitle}>URL, category & authors</p>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>URL slug</label>
                    <p className="font-sans text-muted" style={{ fontSize: '0.72rem', margin: '0 0 0.35rem', lineHeight: 1.4 }}>
                      Live path:{' '}
                      <strong>
                        {printEditionId
                          ? `/print-edition/${slug || '…'}`
                          : isPremium
                            ? `/premium-article/${slug || '…'}`
                            : `/${slug || '…'}`}
                      </strong>
                      {' '}· {slugQuality.length}/72 chars · {slugQuality.wordCount} words
                      {slugQuality.ok ? ' · looks good' : ''}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => {
                          setSlugLocked(true);
                          setSlug(sanitizeSlugInput(e.target.value));
                        }}
                        onBlur={() =>
                          setSlug((s: string) =>
                            sanitizeSlugInput(s) || slugifyTitle(title, { dropStopWords: true })
                          )
                        }
                        required
                        placeholder="byu-housing-policy-debate"
                        className={styles.textInput}
                        style={{
                          borderColor: slug && !slugQuality.ok ? '#fca5a5' : undefined,
                        }}
                      />
                      <button
                        type="button"
                        onClick={generateSlug}
                        disabled={isGeneratingSlug}
                        className="btn btn-secondary font-sans text-sm"
                        title="AI slug from title + content"
                      >
                        {isGeneratingSlug ? '…' : 'AI'}
                      </button>
                    </div>
                    {slugQuality.warnings.length > 0 && (
                      <ul className="font-sans" style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem', fontSize: '0.72rem', color: '#b45309', lineHeight: 1.4 }}>
                        {slugQuality.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Category (topic) *</label>
                    <select
                      value={['campus', 'politics', 'family', 'faith'].includes(category) ? category : ''}
                      onChange={(e) => setCategory(e.target.value)}
                      className={styles.textInput}
                      required
                    >
                      <option value="" disabled>
                        Select a category…
                      </option>
                      <option value="campus">Campus</option>
                      <option value="politics">Politics</option>
                      <option value="family">Family Issues</option>
                      <option value="faith">Faith</option>
                    </select>
                    <p className={styles.panelHint} style={{ marginTop: '0.35rem' }}>
                      Required topic hub. News and Opinion are not categories — set Format below.
                    </p>
                    {!['campus', 'politics', 'family', 'faith'].includes(category) && (
                      <p className={styles.panelHint} style={{ marginTop: '0.35rem', color: '#b45309' }}>
                        This post still has category &quot;{category || 'unset'}&quot;. Pick Campus, Politics, Family, or Faith before saving.
                      </p>
                    )}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Format (News / Opinion) *</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as 'news' | 'opinion')}
                      className={styles.textInput}
                      required
                    >
                      <option value="news">News</option>
                      <option value="opinion">Opinion / Op-Ed</option>
                    </select>
                    <p className={styles.panelHint} style={{ marginTop: '0.35rem' }}>
                      Required. Opinion pieces also list on /opinion; news-format pieces also list on /news.
                    </p>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Assigned author</label>
                    <select value={assignedAuthorId} onChange={(e) => setAssignedAuthorId(e.target.value)} className={styles.textInput}>
                      {availableAuthors.map((a: any) => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Byline (optional)</label>
                    <input type="text" list="custom-authors-list" value={customAuthor} onChange={(e) => setCustomAuthor(e.target.value)} placeholder="Custom author name" className={styles.textInput} />
                    <datalist id="custom-authors-list">{customAuthorsList.map(name => <option key={name} value={name} />)}</datalist>
                  </div>
                </div>

                <div className={styles.panelCard}>
                  <p className={styles.panelCardTitle}>Publishing</p>
                  <p className={styles.panelHint}>
                    When this story should show as published. Leave blank until ready.
                  </p>
                  <input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className={styles.textInput}
                  />
                </div>

                <div className={styles.panelCard}>
                  <p className={styles.panelCardTitle}>Print edition</p>
                  <p className={styles.panelHint}>
                    Default is <strong>not</strong> in a print edition. Only set this when the story belongs in a print issue
                    (or when you create a draft from a print edition page). Print pieces are usually also Premium.
                  </p>
                  <select
                    value={printEditionId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setPrintEditionId(id);
                      if (id) setIsPremium(true);
                    }}
                    className={styles.textInput}
                  >
                    <option value="">Not in a print edition</option>
                    {printEditions.map((ed) => (
                      <option key={ed.id} value={ed.id}>
                        {ed.title}
                        {ed.isActive ? ' (active)' : ''}
                      </option>
                    ))}
                  </select>
                  {printEditionId ? (
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Order in edition</label>
                      <p className={styles.panelHint}>
                        Position in the print issue table of contents (1, 2, 3…). Not a date.
                      </p>
                      <input
                        type="number"
                        min={1}
                        value={printEditionOrder}
                        onChange={(e) => setPrintEditionOrder(e.target.value)}
                        placeholder="e.g. 3"
                        className={styles.textInput}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className={styles.panelRoot}>
                <div className={`${styles.panelHero} ${styles.panelHeroBlue}`}>
                  <div className={styles.panelHeroTop}>
                    <div>
                      <p className={styles.panelKicker}>Discoverability</p>
                      <h3 className={styles.panelHeroTitle}>SEO assistant</h3>
                    </div>
                    <button
                      type="button"
                      onClick={generateSEO}
                      disabled={isGeneratingSEO}
                      className={styles.panelHeroBtn}
                    >
                      {isGeneratingSEO ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…
                        </>
                      ) : (
                        <>
                          <Wand2 size={14} /> Generate
                        </>
                      )}
                    </button>
                  </div>
                  <p className={styles.panelHeroHint}>
                    Fills SEO title, description, keywords, image alt, and key takeaways from your draft.
                  </p>
                </div>

                <div className={styles.panelCard}>
                  <p className={styles.panelCardTitle}>Metadata</p>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      SEO title{' '}
                      <span className="font-sans text-muted" style={{ fontWeight: 500, fontSize: '0.72rem' }}>
                        ({seoTitle.length}/60 ideal)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value.slice(0, 70))}
                      className={styles.textInput}
                      style={{
                        borderColor:
                          seoTitle && (seoTitle.length < 40 || seoTitle.length > 60) ? '#fcd34d' : undefined,
                      }}
                      placeholder="Primary keyword near the front"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      SEO description{' '}
                      <span className="font-sans text-muted" style={{ fontWeight: 500, fontSize: '0.72rem' }}>
                        ({seoDescription.length}/155 ideal)
                      </span>
                    </label>
                    <textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value.slice(0, 160))}
                      rows={3}
                      className={styles.textInput}
                      style={{
                        resize: 'vertical',
                        borderColor:
                          seoDescription &&
                          (seoDescription.length < 120 || seoDescription.length > 160)
                            ? '#fcd34d'
                            : undefined,
                      }}
                      placeholder="One clear sentence + soft CTA with concrete entities"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Keywords</label>
                    <input
                      type="text"
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                      className={styles.textInput}
                      placeholder="byu, provo, honor code"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      Image alt text{' '}
                      <span className="font-sans text-muted" style={{ fontWeight: 500, fontSize: '0.72rem' }}>
                        ({featuredImageAlt.length}/125)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={featuredImageAlt}
                      onChange={(e) => setFeaturedImageAlt(e.target.value.slice(0, 125))}
                      className={styles.textInput}
                      placeholder="Who / what / where — no “image of”"
                    />
                  </div>
                </div>

                <SeoAnalysisPanel
                  title={title} seoTitle={seoTitle} seoDescription={seoDescription} slug={slug} content={content}
                  excerpt={content.replace(/<[^>]+>/g, ' ').substring(0, 150)} category={category} focusKeyword={focusKeyword}
                  onFocusKeywordChange={setFocusKeyword} schemaTypes={['Article', 'NewsArticle']}
                  onApplySeoTitle={setSeoTitle}
                  onApplySeoDescription={setSeoDescription}
                  onApplyTitle={setTitle}
                  onApplySlug={(v) => {
                    setSlugLocked(true);
                    setSlug(sanitizeSlugInput(v) || slugifyTitle(title, { dropStopWords: true }));
                  }}
                />
              </div>
            )}

            {activeTab === 'spellcheck' && (
              <div className={styles.panelRoot}>
                <div className={`${styles.panelHero} ${styles.panelHeroViolet}`}>
                  <p className={styles.panelKicker}>Copy polish</p>
                  <h3 className={styles.panelHeroTitle}>AI edits</h3>
                  <p className={styles.panelHeroHint}>
                    Run spellcheck and review suggested wording changes before you submit.
                  </p>
                </div>
                <AiSpellcheckPanel
                  content={content}
                  onApplySuggestion={(original, suggested) => {
                    const newContent = content.replace(original, suggested);
                    setContent(newContent);
                    editorRef.current?.getEditor()?.commands.setContent(newContent, { emitUpdate: false });
                  }}
                />
              </div>
            )}

            {activeTab === 'checklist' && (() => {
              const done = CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;
              const total = CHECKLIST_ITEMS.length;
              const pct = Math.round((done / total) * 100);
              const allDone = done === total;
              const missing = incompleteChecklistLabels(checklist);

              return (
                <div className={styles.checklistRoot}>
                  <div className={`${styles.panelHero} ${allDone ? styles.panelHeroGreen : styles.panelHeroNavy}`}>
                    <div className={styles.panelHeroTop}>
                      <div>
                        <p className={styles.panelKicker}>Pre-publish</p>
                        <h3 className={styles.panelHeroTitle}>
                          {allDone ? 'All set to go' : 'Editorial checklist'}
                        </h3>
                      </div>
                      <div className={styles.checklistScore} aria-label={`${done} of ${total} complete`}>
                        <span className={styles.checklistScoreNum}>{done}</span>
                        <span className={styles.checklistScoreOf}>/{total}</span>
                      </div>
                    </div>
                    <div className={styles.checklistTrack} role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
                      <div className={styles.checklistFill} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={styles.panelHeroTop} style={{ marginTop: '0.15rem', alignItems: 'center' }}>
                      <p className={styles.panelHeroHint} style={{ margin: 0 }}>
                        {allDone
                          ? 'Every item is checked. You can submit, approve, or publish.'
                          : `Required before publish · ${total - done} left · saves with the draft`}
                      </p>
                      <button
                        type="button"
                        className={styles.panelHeroBtn}
                        onClick={runAiChecklistReview}
                        disabled={isReviewingChecklist}
                        title="AI reviews the draft and checks off items that look done"
                      >
                        {isReviewingChecklist ? (
                          <>
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Checking…
                          </>
                        ) : (
                          <>
                            <Wand2 size={14} /> AI check
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {checklistGate && !allDone && (
                    <div className={styles.checklistGate} role="alert">
                      <p className={styles.checklistGateTitle}>Check the list before publishing</p>
                      <p className={styles.checklistGateBody}>
                        Finish every item below, then try again.
                        {missing.length ? ` Still open: ${missing.join(', ')}.` : ''}
                        {' '}You can also use <strong>AI check</strong> to verify and auto-check what looks ready.
                      </p>
                    </div>
                  )}

                  {Object.keys(checklistAiNotes).length > 0 && (
                    <div className={styles.panelCard}>
                      <p className={styles.panelCardTitle}>AI review notes</p>
                      <ul className={styles.checklistAiNotes}>
                        {CHECKLIST_ITEMS.map((item) => {
                          const note = checklistAiNotes[item.key];
                          if (!note) return null;
                          return (
                            <li
                              key={item.key}
                              className={`${styles.checklistAiNote} ${note.pass ? styles.checklistAiNotePass : styles.checklistAiNoteFail}`}
                            >
                              <strong>{item.title}:</strong> {note.note}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <ul className={styles.checklistList}>
                    {CHECKLIST_ITEMS.map((item) => {
                      const checked = checklist[item.key];
                      const needsAttention = checklistGate && !checked;
                      return (
                        <li key={item.key}>
                          <button
                            type="button"
                            className={`${styles.checklistItem} ${checked ? styles.checklistItemDone : ''} ${needsAttention ? styles.checklistItemNeedsAttention : ''}`}
                            onClick={() => {
                              const next = { ...checklist, [item.key]: !checklist[item.key] };
                              setChecklist(next);
                              if (isChecklistComplete(next)) setChecklistGate(false);
                            }}
                            aria-pressed={checked}
                          >
                            <span className={styles.checklistCheck} aria-hidden>
                              {checked ? (
                                <CheckCircle2 size={22} strokeWidth={2.25} />
                              ) : (
                                <span className={styles.checklistRing} />
                              )}
                            </span>
                            <span className={styles.checklistBody}>
                              <span className={styles.checklistItemTitle}>{item.title}</span>
                              <span className={styles.checklistItemHint}>{item.hint}</span>
                            </span>
                            <span className={styles.checklistStep}>{item.step}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {activeTab === 'notes' && (
              <div className={styles.panelRoot}>
                <div className={`${styles.panelHero} ${styles.panelHeroAmber}`}>
                  <div className={styles.panelHeroTop}>
                    <div>
                      <p className={styles.panelKicker}>Collaboration</p>
                      <h3 className={styles.panelHeroTitle}>Editorial notes</h3>
                    </div>
                    {post?.editorialNotes?.length ? (
                      <div className={styles.checklistScore}>
                        <span className={styles.checklistScoreNum}>{post.editorialNotes.length}</span>
                      </div>
                    ) : null}
                  </div>
                  <p className={styles.panelHeroHint}>
                    Feedback between writers and editors. Saved on the story timeline.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '420px', overflowY: 'auto' }}>
                  {(!post?.editorialNotes || post.editorialNotes.length === 0) ? (
                    <div className={styles.noteEmpty}>No notes yet.</div>
                  ) : (
                    post.editorialNotes.map((note: any) => (
                      <div key={note.id} className={`${styles.noteCard} ${note.resolved ? styles.noteCardResolved : ''}`}>
                        <div className={styles.noteMeta}>
                          <span className={styles.noteAuthor}>{note.author?.name || 'Editor'}</span>
                          <span className={styles.noteDate}>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className={styles.noteBody}>{note.content}</p>
                        {note.resolved && <span className={styles.noteResolvedBadge}>Resolved</span>}
                      </div>
                    ))
                  )}
                </div>

                {(userRole === 'EDITOR' || userRole === 'ADMIN') && (
                  <div className={styles.panelCard}>
                    <p className={styles.panelCardTitle}>Leave a note</p>
                    <form action={addEditorialNote} className={styles.noteForm}>
                      <input type="hidden" name="postId" value={post?.id || ''} />
                      <textarea name="content" rows={4} required placeholder="Suggest changes here..." className={styles.textInput} style={{ resize: 'vertical' }} />
                      <div className={styles.noteFormActions}>
                        <button type="submit" className="btn btn-primary font-sans text-sm w-full">Add note</button>
                        {post?.state === 'IN_REVIEW' && (
                          <button type="submit" name="requestChanges" value="true" className={styles.btnDanger}>Request changes</button>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

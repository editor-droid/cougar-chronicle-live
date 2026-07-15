'use client';

import { useState, useRef } from 'react';
import { RichTextEditor, RichTextEditorHandle } from '@/components/RichTextEditor';
import { SeoAnalysisPanel } from '@/components/SeoAnalysisPanel';
import { AiSpellcheckPanel } from '@/components/AiSpellcheckPanel';
import { savePost, updatePostState, addEditorialNote } from '../../actions';
import { useRouter } from 'next/navigation';
import { FileDown, Loader2, X, Settings, Image as ImageIcon, CheckCircle2, PanelRightClose, PanelRightOpen, ArrowLeft, Wand2 } from 'lucide-react';
import styles from './EditorForm.module.css';

export default function EditorForm({ post, authorId, userRole, availableAuthors = [], customAuthorsList = [], isNew = false }: { post: any, authorId: string, userRole: string, availableAuthors?: any[], customAuthorsList?: string[], isNew?: boolean }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('settings'); 

  const [title, setTitle] = useState(post?.title || '');
  const [category, setCategory] = useState(post?.category || 'news');
  const [format, setFormat] = useState<'news' | 'opinion'>(
    post?.format === 'opinion' || post?.category === 'opinion' || post?.category === 'Opinion'
      ? 'opinion'
      : 'news'
  );
  const [slug, setSlug] = useState(post?.slug || '');
  const [imageUrl, setImageUrl] = useState(post?.imageUrl || '');
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription || '');
  const [seoKeywords, setSeoKeywords] = useState(post?.seoKeywords || '');
  const [featuredImageAlt, setFeaturedImageAlt] = useState(post?.featuredImageAlt || '');
  
  const [customAuthor, setCustomAuthor] = useState(post?.customAuthor || '');
  const [isPremium, setIsPremium] = useState(post?.isPremium || false);
  const [keyInsights, setKeyInsights] = useState(post?.keyInsights || '');
  const [assignedAuthorId, setAssignedAuthorId] = useState(post?.authorId || authorId);
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
      if (data.slug) setSlug(data.slug);
    } catch(err) {
      alert('Failed to generate slug');
    } finally {
      setIsGeneratingSlug(false);
    }
  };

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
      if (!response.ok) throw new Error('Failed to generate SEO');
      const data = await response.json();
      setSeoTitle(data.seoTitle || '');
      setSeoDescription(data.seoDescription || '');
      setSeoKeywords(data.seoKeywords || '');
      setFeaturedImageAlt(data.featuredImageAlt || '');
    } catch (err) {
      console.error(err);
      alert('Failed to generate SEO metadata. Please try again.');
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const handleSaveData = async (newState?: string) => {
    setIsSubmitting(true);
    try {
      await savePost({
        id: post?.id,
        title, slug, category, format, content, imageUrl, authorId: assignedAuthorId,
        seoTitle, seoDescription, seoKeywords,
        keyInsights, featuredImageAlt, customAuthor, isPremium,
        isAmerica250, isBreaking, breakingHours: isBreaking ? breakingHours || 24 : null,
        printEditionOrder, imageCaption,
        publishedAt: publishedAt || undefined
      });

      if (newState && post?.id) {
        const fd = new FormData();
        fd.append('postId', post.id);
        fd.append('newState', newState);
        await updatePostState(fd);
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      alert('Failed to save post. Slug might already be in use.');
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
                  setTitle(e.target.value);
                  if (!post) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
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
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />
                <RichTextEditor
                  ref={editorRef}
                  value={content}
                  onChange={setContent}
                  onImageInsert={() => fileInputRef.current?.click()}
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
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className={styles.inputGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.inputLabel}>Featured Image</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" title="Require a subscription or lifetime purchase to read." onClick={() => setIsPremium(!isPremium)} className={`${styles.pillToggle} ${isPremium ? styles.pillActive : ''}`}>★ Premium</button>
                      <button type="button" title="Feature this in the America 250 collection." onClick={() => setIsAmerica250(!isAmerica250)} className={`${styles.pillToggle} ${isAmerica250 ? styles.pillActive : ''}`}>🇺🇸 America 250</button>
                      <button type="button" title="Pin as breaking news (banner + push)." onClick={() => setIsBreaking(!isBreaking)} className={`${styles.pillToggle} ${isBreaking ? styles.pillActive : ''}`}>⚡ Breaking</button>
                      {isBreaking && (
                        <select
                          value={breakingHours === '' ? 24 : breakingHours}
                          onChange={(e) => setBreakingHours(Number(e.target.value))}
                          className="font-sans text-sm"
                          style={{ marginLeft: '0.35rem', padding: '0.25rem 0.4rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
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
                    className={styles.textInput} style={{ marginTop: '0.5rem' }}
                  />
                  <input 
                    type="text" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} 
                    placeholder="Image Caption / Credit" 
                    className={styles.textInput}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>URL Slug</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="my-new-post" className={styles.textInput} />
                    <button type="button" onClick={generateSlug} disabled={isGeneratingSlug} className="btn btn-secondary font-sans text-sm">AI</button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Category & Authors</label>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Section
                  </label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={styles.textInput}>
                    <option value="news">News</option>
                    <option value="politics">Politics</option>
                    <option value="faith">Faith</option>
                    <option value="family">Family</option>
                    <option value="print-edition">Print Edition</option>
                  </select>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', margin: '1rem 0 0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Format
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setFormat('news')}
                      className={`${styles.pillToggle} ${format === 'news' ? styles.pillActive : ''}`}
                    >
                      News
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('opinion')}
                      className={`${styles.pillToggle} ${format === 'opinion' ? styles.pillActive : ''}`}
                    >
                      Opinion (op-ed)
                    </button>
                  </div>
                  <p className="font-sans" style={{ fontSize: '0.7rem', color: '#9ca3af', margin: '0.4rem 0 0' }}>
                    Section = desk. Format = reportage vs opinion (any section can be an op-ed).
                  </p>
                  <select value={assignedAuthorId} onChange={(e) => setAssignedAuthorId(e.target.value)} className={styles.textInput}>
                    {availableAuthors.map((a: any) => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
                  </select>
                  <input type="text" list="custom-authors-list" value={customAuthor} onChange={(e) => setCustomAuthor(e.target.value)} placeholder="Custom Author Name (Optional)" className={styles.textInput} />
                  <datalist id="custom-authors-list">{customAuthorsList.map(name => <option key={name} value={name} />)}</datalist>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Publishing</label>
                  <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className={styles.textInput} />
                  <input type="number" value={printEditionOrder} onChange={(e) => setPrintEditionOrder(e.target.value)} placeholder="Print Edition Order (e.g. 3)" className={styles.textInput} />
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {(userRole === 'ADMIN' || userRole === 'EDITOR') && (
                  <div style={{ padding: '1.25rem', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h3 className="font-serif" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0369a1' }}>AI SEO Assistant</h3>
                        <p style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem' }}>Generate optimized metadata</p>
                      </div>
                      <button type="button" onClick={generateSEO} disabled={isGeneratingSEO} className="btn font-sans" style={{ backgroundColor: '#0284c7', color: 'white', padding: '0.5rem' }}>
                        {isGeneratingSEO ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Settings size={16} />}
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className={styles.inputGroup}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#075985' }}>SEO Title</label>
                        <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={styles.textInput} style={{ borderColor: '#bae6fd' }} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#075985' }}>SEO Description</label>
                        <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className={styles.textInput} style={{ borderColor: '#bae6fd', resize: 'vertical' }} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#075985' }}>Keywords</label>
                        <input type="text" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} className={styles.textInput} style={{ borderColor: '#bae6fd' }} />
                      </div>
                      <div className={styles.inputGroup}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#075985' }}>Image Alt Text</label>
                        <input type="text" value={featuredImageAlt} onChange={(e) => setFeaturedImageAlt(e.target.value)} className={styles.textInput} style={{ borderColor: '#bae6fd' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <SeoAnalysisPanel
                  title={title} seoTitle={seoTitle} seoDescription={seoDescription} slug={slug} content={content}
                  excerpt={content.replace(/<[^>]+>/g, ' ').substring(0, 150)} category={category} focusKeyword={focusKeyword}
                  onFocusKeywordChange={setFocusKeyword} schemaTypes={['Article', 'NewsArticle']}
                  onApplySeoTitle={setSeoTitle} onApplySeoDescription={setSeoDescription} onApplyTitle={setTitle} onApplySlug={setSlug}
                />
              </div>
            )}

            {activeTab === 'spellcheck' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                  {(!post?.editorialNotes || post.editorialNotes.length === 0) ? (
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>No notes yet.</div>
                  ) : (
                    post.editorialNotes.map((note: any) => (
                      <div key={note.id} style={{ padding: '1rem', borderRadius: '1rem', borderLeft: '4px solid', borderColor: note.resolved ? '#d1d5db' : 'var(--primary)', backgroundColor: note.resolved ? '#f9fafb' : 'var(--surface-hover)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: note.resolved ? '#6b7280' : 'var(--primary)' }}>{note.author?.name || 'Editor'}</span>
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: note.resolved ? '#6b7280' : '#1f2937' }}>{note.content}</p>
                        {note.resolved && <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic', marginTop: '0.5rem', display: 'block' }}>Resolved</span>}
                      </div>
                    ))
                  )}
                </div>

                {(userRole === 'EDITOR' || userRole === 'ADMIN') && (
                  <form action={addEditorialNote} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input type="hidden" name="postId" value={post?.id || ''} />
                    <label style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151' }}>Leave a Note</label>
                    <textarea name="content" rows={4} required placeholder="Suggest changes here..." className={styles.textInput} style={{ resize: 'vertical', backgroundColor: '#f9fafb' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary font-sans text-sm w-full">Add Note</button>
                      {post?.state === 'IN_REVIEW' && (
                        <button type="submit" name="requestChanges" value="true" className="btn font-sans text-sm w-full" style={{ backgroundColor: '#dc2626', color: 'white' }}>Request Changes</button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}
            
          </div>
        </aside>
      </div>
    </div>
  );
}

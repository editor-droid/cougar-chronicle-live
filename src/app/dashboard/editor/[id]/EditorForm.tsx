'use client';

import { useState, useRef } from 'react';
import { RichTextEditor, RichTextEditorHandle } from '@/components/RichTextEditor';
import { SeoAnalysisPanel } from '@/components/SeoAnalysisPanel';
import { savePost, updatePostState, addEditorialNote } from '../../actions';
import { useRouter } from 'next/navigation';


export default function EditorForm({ post, authorId, userRole, availableAuthors = [] }: { post: any, authorId: string, userRole: string, availableAuthors?: any[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || '');
  const [category, setCategory] = useState(post?.category || 'news');
  const [slug, setSlug] = useState(post?.slug || '');
  const [imageUrl, setImageUrl] = useState(post?.imageUrl || '');
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription || '');
  const [seoKeywords, setSeoKeywords] = useState(post?.seoKeywords || '');
  const [featuredImageAlt, setFeaturedImageAlt] = useState(post?.featuredImageAlt || '');
  
  const [customAuthor, setCustomAuthor] = useState(post?.customAuthor || '');
  const [keyInsights, setKeyInsights] = useState(post?.keyInsights || '');
  const [assignedAuthorId, setAssignedAuthorId] = useState(post?.authorId || authorId);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [isUploadingFeatured, setIsUploadingFeatured] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const featuredFileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState(post?.content || '<p>Start writing your story here...</p>');
  const [focusKeyword, setFocusKeyword] = useState(post?.seoKeywords?.split(',')[0] || '');
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      // 1. Get presigned URL
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      
      if (!response.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await response.json();

      // 2. Upload file directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file to storage');

      // 3. Insert image into editor
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
      // 1. Get presigned URL
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      
      if (!response.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await response.json();

      // 2. Upload file directly to R2
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (false) return;
    
    setIsSubmitting(true);
    try {
            await savePost({
        id: post?.id,
        title,
        slug,
        category,
        content,
        imageUrl,
        authorId: assignedAuthorId,
        seoTitle,
        seoDescription,
        seoKeywords,
        keyInsights,
        featuredImageAlt,
        customAuthor
      });
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      alert('Failed to save post. Slug might already be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '2rem', paddingBottom: '4rem', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Writer Unresolved Notes Warning */}
        {userRole === 'WRITER' && post?.editorialNotes?.some((n: any) => !n.resolved) && (
          <div style={{ padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '0.5rem', color: '#991b1b', fontWeight: 'bold' }}>
            ⚠️ An editor has requested changes. Please review the notes in the sidebar.
          </div>
        )}
      {/* Editorial Status & Quick Workflow Actions */}
      {post && (
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="font-sans text-xs text-muted" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>CURRENT STATUS:</span>
            <span style={{ 
              padding: '0.25rem 0.75rem', 
              borderRadius: '1rem', 
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: post.state === 'PUBLISHED' ? 'green' : post.state === 'IN_REVIEW' ? 'var(--accent)' : 'var(--surface-hover)',
              color: post.state === 'PUBLISHED' || post.state === 'IN_REVIEW' ? '#fff' : 'var(--muted)'
            }}>
              {post.state}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* Writer Action */}
            {userRole === 'WRITER' && post.state === 'DRAFT' && (
              <button 
                type="button" 
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                                        await savePost({ 
                      id: post.id, title, slug, category, content, imageUrl, authorId: assignedAuthorId,
                      seoTitle, seoDescription, seoKeywords,
        keyInsights, featuredImageAlt, customAuthor
                    });
                    
                    const fd = new FormData();
                    fd.append('postId', post.id);
                    fd.append('newState', 'IN_REVIEW');
                    await updatePostState(fd);
                    
                    alert('Submitted for Review successfully!');
                    router.push('/dashboard');
                    router.refresh();
                  } catch (err) {
                    alert('Failed to submit post.');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="btn btn-primary font-sans text-sm"
                disabled={isSubmitting}
              >
                Submit for Review
              </button>
            )}
            
            {/* Editor Actions */}
            {(userRole === 'EDITOR' || userRole === 'ADMIN') && post.state === 'IN_REVIEW' && (
              <button 
                type="button" 
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                                        await savePost({ 
                      id: post.id, title, slug, category, content, imageUrl, authorId: assignedAuthorId,
                      seoTitle, seoDescription, seoKeywords,
        keyInsights, featuredImageAlt, customAuthor
                    });
                    
                    const fd = new FormData();
                    fd.append('postId', post.id);
                    fd.append('newState', 'APPROVED');
                    await updatePostState(fd);
                    
                    alert('Post Approved successfully!');
                    router.push('/dashboard');
                    router.refresh();
                  } catch (err) {
                    alert('Failed to approve post.');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="btn btn-secondary font-sans text-sm"
                disabled={isSubmitting}
              >
                Approve Draft
              </button>
            )}
            
            {(userRole === 'EDITOR' || userRole === 'ADMIN') && (post.state === 'APPROVED' || post.state === 'IN_REVIEW') && (
              <button 
                type="button" 
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                                        await savePost({ 
                      id: post.id, title, slug, category, content, imageUrl, authorId: assignedAuthorId,
                      seoTitle, seoDescription, seoKeywords,
        keyInsights, featuredImageAlt, customAuthor
                    });
                    
                    const fd = new FormData();
                    fd.append('postId', post.id);
                    fd.append('newState', 'PUBLISHED');
                    await updatePostState(fd);
                    
                    alert('Post Published Live!');
                    router.push('/dashboard');
                    router.refresh();
                  } catch (err) {
                    alert('Failed to publish post.');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="btn font-sans text-sm"
                style={{ backgroundColor: 'green', color: 'white' }}
                disabled={isSubmitting}
              >
                Publish Live
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '300px' }}>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Headline</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => {
                setTitle(e.target.value);
                if (!post) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
              }} 
              placeholder="Breaking News..." 
              required 
              style={{ fontSize: '1.5rem', padding: '1rem', fontFamily: 'var(--font-serif)', fontWeight: 700 }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.25rem', fontFamily: 'var(--font-sans)', fontSize: '1rem' }}
            >
              <option value="news">News</option>
              <option value="faith">Faith</option>
              <option value="opinion">Opinion</option>
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>URL Slug</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={slug} 
                onChange={(e) => setSlug(e.target.value)} 
                required 
                placeholder="my-new-post"
                style={{ flex: 1, fontFamily: 'monospace', width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
              />
              <button 
                type="button" 
                onClick={generateSlug}
                disabled={isGeneratingSlug}
                className="btn btn-secondary font-sans text-sm"
              >
                {isGeneratingSlug ? '...' : '✨ AI'}
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Custom Byline (Optional)</label>
            <input 
              type="text" 
              value={customAuthor} 
              onChange={(e) => setCustomAuthor(e.target.value)} 
              placeholder="e.g. John Doe and Jane Smith"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
            />
          </div>

          {(userRole === 'ADMIN' || userRole === 'EDITOR') && (
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Assigned Author</label>
              <select
                value={assignedAuthorId}
                onChange={(e) => setAssignedAuthorId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.25rem', fontFamily: 'var(--font-sans)', fontSize: '1rem' }}
              >
                {availableAuthors.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name || a.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Featured Image Management Panel */}
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>FEATURED IMAGE</label>
            <p className="font-sans text-xs text-muted" style={{ marginBottom: '1rem' }}>Used for article cards on the homepage and banners.</p>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={imageUrl} 
                onChange={(e) => setImageUrl(e.target.value)} 
                placeholder="/wp-content/uploads/2024/... or external URL"
                style={{ flex: 1 }}
              />
              <button 
                type="button" 
                onClick={() => featuredFileInputRef.current?.click()} 
                className="btn btn-secondary text-sm font-sans"
                disabled={isUploadingFeatured}
              >
                {isUploadingFeatured ? 'Uploading...' : 'Upload'}
              </button>
              <input 
                type="file" 
                ref={featuredFileInputRef} 
                onChange={handleFeaturedImageUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>
          </div>
          
          {imageUrl && (
            <div style={{ width: '150px', height: '90px', position: 'relative', border: '1px solid var(--border)', borderRadius: '0.25rem', overflow: 'hidden', backgroundColor: 'var(--surface-hover)', alignSelf: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrl} 
                alt="Featured Preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <button 
                type="button" 
                onClick={() => setImageUrl('')} 
                style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
          )}
        </div>

        
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Key Insights / Takeaways (Optional)
          </label>
          <textarea 
            value={keyInsights} 
            onChange={(e) => setKeyInsights(e.target.value)} 
            placeholder="Summarize the key points of this article. Readers can expand this box at the top of the article."
            style={{ width: '100%', minHeight: '100px', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Body Content</label>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          <RichTextEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            onImageInsert={() => fileInputRef.current?.click()}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" onClick={() => router.push('/dashboard')} className="btn btn-secondary font-sans">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary font-sans">
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* EDITORIAL NOTES SIDEBAR */}
        {post?.id && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '1.5rem', position: 'sticky', top: '2rem' }}>
          <h3 className="font-serif" style={{ fontSize: '1.25rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>Editorial Notes</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {(!post.editorialNotes || post.editorialNotes.length === 0) ? (
              <p className="font-sans text-sm text-muted">No notes yet.</p>
            ) : (
              post.editorialNotes.map((note: any) => (
                <div key={note.id} style={{ padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: '0.5rem', borderLeft: note.resolved ? '4px solid var(--muted)' : '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="font-sans text-xs" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{note.author?.name || 'Editor'}</span>
                    <span className="font-sans text-xs text-muted">{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="font-sans text-sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: note.resolved ? 'var(--muted)' : 'var(--foreground)' }}>
                    {note.content}
                  </p>
                  {note.resolved && <span className="font-sans text-xs" style={{ color: 'var(--muted)', display: 'block', marginTop: '0.5rem', fontStyle: 'italic' }}>Resolved</span>}
                </div>
              ))
            )}
          </div>

          {(userRole === 'EDITOR' || userRole === 'ADMIN') && (
            <form action={addEditorialNote} style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input type="hidden" name="postId" value={post.id} />
              <label className="font-sans text-sm font-bold">Leave a Note</label>
              <textarea 
                name="content" 
                rows={4} 
                required 
                placeholder="Suggest changes here..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-secondary text-sm font-sans" style={{ width: '100%' }}>Add Note</button>
                {post.state === 'IN_REVIEW' && (
                  <button type="submit" name="requestChanges" value="true" className="btn btn-primary text-sm font-sans" style={{ width: '100%', backgroundColor: '#991b1b', color: 'white' }}>
                    Request Changes (Return to Draft)
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* SEO ANALYSIS PANEL IN SIDEBAR */}
      <div style={{ position: 'sticky', top: post?.id ? 'auto' : '2rem' }}>
        <SeoAnalysisPanel
          title={title}
          seoTitle={seoTitle}
          seoDescription={seoDescription}
          slug={slug}
          content={content}
          excerpt={content.replace(/<[^>]+>/g, ' ').substring(0, 150)}
          category={category}
          focusKeyword={focusKeyword}
          onFocusKeywordChange={setFocusKeyword}
          schemaTypes={['Article', 'NewsArticle']}
          onApplySeoTitle={setSeoTitle}
          onApplySeoDescription={setSeoDescription}
          onApplyTitle={setTitle}
          onApplySlug={setSlug}
        />
      </div>
      </div>
    </div>
  );
}

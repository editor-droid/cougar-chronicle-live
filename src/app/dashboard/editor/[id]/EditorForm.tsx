'use client';

import { useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { savePost, updatePostState } from '../../actions';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';

export default function EditorForm({ post, authorId, userRole }: { post: any, authorId: string, userRole: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || '');
  const [category, setCategory] = useState(post?.category || 'news');
  const [slug, setSlug] = useState(post?.slug || '');
  const [imageUrl, setImageUrl] = useState(post?.imageUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFeatured, setIsUploadingFeatured] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const featuredFileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: post?.content || '<p>Start writing your story here...</p>',
    editorProps: {
      attributes: {
        class: 'focus:outline-none font-serif',
        style: 'min-height: 400px; padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem; background-color: var(--surface); font-size: 1.125rem; line-height: 1.8;'
      },
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      if (editor) {
        editor.chain().focus().setImage({ src: newBlob.url }).run();
      }
    } catch (err) {
      console.error('Failed to upload image', err);
      alert('Failed to upload image. Ensure Vercel Blob is configured correctly.');
    }
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingFeatured(true);
    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      setImageUrl(newBlob.url);
    } catch (err) {
      console.error('Failed to upload featured image', err);
      alert('Failed to upload featured image. Ensure Vercel Blob is configured correctly.');
    } finally {
      setIsUploadingFeatured(false);
      if (featuredFileInputRef.current) featuredFileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    
    setIsSubmitting(true);
    try {
      const content = editor.getHTML();
      await savePost({
        id: post?.id,
        title,
        slug,
        category,
        content,
        imageUrl,
        authorId
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>
      
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
                    const content = editor?.getHTML() || '';
                    await savePost({ id: post.id, title, slug, category, content, imageUrl, authorId });
                    
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
                    const content = editor?.getHTML() || '';
                    await savePost({ id: post.id, title, slug, category, content, imageUrl, authorId });
                    
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
                    const content = editor?.getHTML() || '';
                    await savePost({ id: post.id, title, slug, category, content, imageUrl, authorId });
                    
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
        
        <div>
          <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>URL Slug</label>
          <input 
            type="text" 
            value={slug} 
            onChange={(e) => setSlug(e.target.value)} 
            required 
            placeholder="my-new-post"
            style={{ fontFamily: 'monospace' }}
          />
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

        <div>
          <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Body Content</label>
          {/* Editor Toolbar */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '0.25rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="btn btn-secondary text-sm font-sans">Bold</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="btn btn-secondary text-sm font-sans">Italic</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="btn btn-secondary text-sm font-sans">Heading 2</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className="btn btn-secondary text-sm font-sans">Quote</button>
            <div style={{ width: '1px', backgroundColor: 'var(--border)', margin: '0 0.5rem' }}></div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-secondary text-sm font-sans">Add Image</button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>
          <EditorContent editor={editor} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button type="button" onClick={() => router.push('/dashboard')} className="btn btn-secondary font-sans">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary font-sans">
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}

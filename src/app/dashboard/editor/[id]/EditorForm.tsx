'use client';

import { useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { savePost } from '../../actions';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';

export default function EditorForm({ post, authorId }: { post: any, authorId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || '');
  const [category, setCategory] = useState(post?.category || 'news');
  const [slug, setSlug] = useState(post?.slug || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert('Failed to upload image. Ensure Vercel Blob is configured and you have the right permissions.');
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
        authorId
      });
      router.push('/dashboard');
    } catch (error) {
      alert('Failed to save post. Slug might already be in use.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 2 }}>
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
        <div style={{ flex: 1 }}>
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

      <div>
        <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>Body Content</label>
        {/* Editor Toolbar */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '0.25rem' }}>
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
  );
}

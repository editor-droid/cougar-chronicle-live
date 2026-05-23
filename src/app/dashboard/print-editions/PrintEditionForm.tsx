'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PrintEditionForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [pdfUrl, setPdfUrl] = useState(initialData?.pdfUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || '');
  const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);

  // File states for upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleUpload = async (file: File) => {
    const filename = encodeURIComponent(file.name);
    const fileType = encodeURIComponent(file.type);

    const res = await fetch(`/api/upload?file=${filename}&fileType=${fileType}`);
    const { url, publicUrl } = await res.json();

    await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
    
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setUploadStatus('Uploading files...');

    try {
      let finalPdfUrl = pdfUrl;
      if (pdfFile) {
        finalPdfUrl = await handleUpload(pdfFile);
      }

      let finalCoverUrl = coverImageUrl;
      if (coverFile) {
        finalCoverUrl = await handleUpload(coverFile);
      }
      
      setUploadStatus('Saving edition...');

      const method = initialData ? 'PUT' : 'POST';
      const endpoint = initialData ? `/api/print-editions/${initialData.id}` : '/api/print-editions';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          pdfUrl: finalPdfUrl,
          coverImageUrl: finalCoverUrl,
          isActive
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save print edition');
      }

      router.push('/dashboard/print-editions');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
      {error && <div style={{ color: 'red', padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '0.25rem' }}>{error}</div>}
      
      <div>
        <label className="font-sans" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Title (e.g. Volume 1: Standing for Something)</label>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          required
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
        />
      </div>

      <div>
        <label className="font-sans" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Cover Image</label>
        <input 
          type="file" 
          accept="image/*"
          onChange={e => setCoverFile(e.target.files?.[0] || null)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
        />
        <p className="font-sans text-muted text-sm" style={{ marginTop: '0.5rem' }}>Or provide an existing URL below:</p>
        <input 
          type="text" 
          value={coverImageUrl} 
          onChange={e => setCoverImageUrl(e.target.value)} 
          placeholder="https://..."
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', marginTop: '0.5rem' }}
        />
      </div>

      <div>
        <label className="font-sans" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Print Edition PDF</label>
        <input 
          type="file" 
          accept="application/pdf"
          onChange={e => setPdfFile(e.target.files?.[0] || null)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
        />
        <p className="font-sans text-muted text-sm" style={{ marginTop: '0.5rem' }}>Or provide an existing URL below:</p>
        <input 
          type="text" 
          value={pdfUrl} 
          onChange={e => setPdfUrl(e.target.value)} 
          placeholder="https://..."
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.25rem', border: '1px solid var(--border)', marginTop: '0.5rem' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input 
          type="checkbox" 
          id="isActive"
          checked={isActive} 
          onChange={e => setIsActive(e.target.checked)} 
          style={{ width: '1.25rem', height: '1.25rem' }}
        />
        <label htmlFor="isActive" className="font-sans" style={{ fontWeight: 'bold' }}>Active (Show on Print Edition Page)</label>
      </div>

      <button type="submit" disabled={isSubmitting} className="btn btn-primary font-sans" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.125rem' }}>
        {isSubmitting ? uploadStatus : 'Save Print Edition'}
      </button>
    </form>
  );
}

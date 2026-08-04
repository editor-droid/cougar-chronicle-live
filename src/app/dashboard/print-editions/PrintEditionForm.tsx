'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ImageIcon, Loader2 } from 'lucide-react';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0.9rem',
  borderRadius: '0.75rem',
  border: 'none',
  background: 'var(--surface-hover)',
  fontSize: '0.95rem',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
};

export default function PrintEditionForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState(initialData?.title || '');
  const [pdfUrl, setPdfUrl] = useState(initialData?.pdfUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || '');
  const [isActive, setIsActive] = useState(initialData ? initialData.isActive : true);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleUpload = async (file: File) => {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    const put = await fetch(data.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!put.ok) throw new Error('File upload failed');
    return data.publicUrl as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setUploadStatus('Uploading files…');

    try {
      let finalPdfUrl = pdfUrl;
      if (pdfFile) finalPdfUrl = await handleUpload(pdfFile);

      let finalCoverUrl = coverImageUrl;
      if (coverFile) finalCoverUrl = await handleUpload(coverFile);

      setUploadStatus('Saving edition…');

      const method = initialData ? 'PUT' : 'POST';
      const endpoint = initialData ? `/api/print-editions/${initialData.id}` : '/api/print-editions';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          pdfUrl: finalPdfUrl,
          coverImageUrl: finalCoverUrl,
          isActive,
        }),
      });

      if (!res.ok) throw new Error('Failed to save print edition');

      const saved = await res.json().catch(() => null);
      // After create → open the edition so you can add articles right away
      if (!initialData && saved?.id) {
        router.push(`/dashboard/print-editions/${saved.id}`);
      } else if (initialData?.id) {
        router.push(`/dashboard/print-editions/${initialData.id}`);
      } else {
        router.push('/dashboard/print-editions');
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  const coverPreview =
    coverFile != null ? URL.createObjectURL(coverFile) : coverImageUrl || '';

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 140px) minmax(0, 1fr)',
        gap: '1.5rem',
        padding: '1.35rem',
        borderRadius: '1.15rem',
        background: 'var(--surface)',
        boxShadow: '0 1px 3px rgba(27, 34, 83, 0.06)',
        alignItems: 'start',
      }}
    >
      {/* Cover column */}
      <div>
        <div
          style={{
            width: '100%',
            aspectRatio: '3 / 4',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            background: 'var(--surface-hover)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPreview}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '0.5rem' }}>
              <ImageIcon size={28} style={{ margin: '0 auto 0.35rem', opacity: 0.5 }} />
              <span className="font-sans" style={{ fontSize: '0.7rem' }}>
                Cover
              </span>
            </div>
          )}
        </div>
        <label
          className="font-sans"
          style={{
            display: 'block',
            marginTop: '0.65rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--primary)',
            cursor: 'pointer',
          }}
        >
          Change cover
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
        {error && (
          <div
            className="font-sans"
            style={{
              color: '#991b1b',
              padding: '0.75rem 1rem',
              background: 'rgba(185, 28, 28, 0.08)',
              borderRadius: '0.75rem',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        <div>
          <label className="font-sans" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Volume 1: Standing for Something"
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="font-sans" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
            Cover image URL
          </label>
          <input
            type="text"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://… (optional if you upload a file)"
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="font-sans" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
            PDF
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <label
              className="font-sans"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '999px',
                background: 'var(--surface-hover)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              <FileText size={15} style={{ color: 'var(--primary)' }} />
              {pdfFile ? pdfFile.name : 'Upload PDF'}
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
            </label>
            {pdfUrl && !pdfFile && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans"
                style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}
              >
                Current PDF ↗
              </a>
            )}
          </div>
          <input
            type="text"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="Or paste PDF URL"
            style={fieldStyle}
          />
        </div>

        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className="font-sans"
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.45rem 0.85rem 0.45rem 0.45rem',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            background: isActive ? 'rgba(22, 163, 74, 0.12)' : 'var(--surface-hover)',
            color: isActive ? '#166534' : 'var(--muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}
        >
          <span
            style={{
              width: 36,
              height: 22,
              borderRadius: 11,
              background: isActive ? '#16a34a' : '#d1d5db',
              position: 'relative',
              transition: 'background 0.15s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: isActive ? 16 : 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.15s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}
            />
          </span>
          {isActive ? 'Active on site' : 'Hidden from site'}
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary font-sans"
          style={{
            marginTop: '0.25rem',
            alignSelf: 'flex-start',
            borderRadius: '999px',
            padding: '0.7rem 1.35rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              {uploadStatus || 'Saving…'}
            </>
          ) : (
            'Save edition'
          )}
        </button>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </form>
  );
}

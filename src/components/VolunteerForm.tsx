'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, Link2, Upload, X } from 'lucide-react';

/** Open roles + beats — keep in sync with /recruiting open positions. */
export const APPLICATION_INTERESTS = [
  'Staff Writer',
  'Print Editor',
  'Video Editor',
  'Photographer',
  'Investigative Journalist',
  'Content Creator',
  'Editing',
  'Copywriting',
  'Graphic Design',
  'Social Media',
  'BYU News',
  'Faith Issues',
  'Family Issues',
  'Utah Politics',
  'US Politics',
  'Conservative Thought',
] as const;

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface)',
  color: 'var(--foreground)',
  fontSize: '0.95rem',
};

function normalizeInterest(raw: string | null): string | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) return null;
  const match = APPLICATION_INTERESTS.find(
    (i) => i.toLowerCase() === decoded.toLowerCase()
  );
  return match || decoded;
}

export default function VolunteerForm() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    interests: [] as string[],
    socialHandles: '',
    sampleUrl: '',
    samplePdfUrl: '',
    samplePdfName: '',
    website: '', // honeypot
  });

  useEffect(() => {
    const interest = normalizeInterest(searchParams.get('interest'));
    if (!interest) return;
    setFormData((prev) => {
      if (prev.interests.includes(interest)) return prev;
      return { ...prev, interests: [...prev.interests, interest] };
    });
  }, [searchParams]);

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const clearPdf = () => {
    setFormData((prev) => ({ ...prev, samplePdfUrl: '', samplePdfName: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please upload a PDF file.');
      setStatus('error');
      clearPdf();
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErrorMessage('PDF must be under 12 MB.');
      setStatus('error');
      clearPdf();
      return;
    }

    setUploadBusy(true);
    setErrorMessage('');
    setStatus('idle');
    try {
      const presign = await fetch('/api/volunteer/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/pdf',
        }),
      });
      const presignData = await presign.json();
      if (!presign.ok) {
        throw new Error(presignData.error || 'Could not start upload');
      }

      const put = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: file,
      });
      if (!put.ok) {
        throw new Error('PDF upload failed. Please try again.');
      }

      setFormData((prev) => ({
        ...prev,
        samplePdfUrl: presignData.publicUrl,
        samplePdfName: file.name,
      }));
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'PDF upload failed');
      clearPdf();
    } finally {
      setUploadBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    if (!formData.email.toLowerCase().endsWith('.edu')) {
      setStatus('error');
      setErrorMessage('Please provide a valid .edu school email address.');
      return;
    }

    if (formData.interests.length === 0) {
      setStatus('error');
      setErrorMessage('Please select at least one area of interest.');
      return;
    }

    const sampleParts: string[] = [];
    if (formData.sampleUrl.trim()) {
      sampleParts.push(`Link / Google Doc: ${formData.sampleUrl.trim()}`);
    }
    if (formData.samplePdfUrl) {
      sampleParts.push(
        `PDF: ${formData.samplePdfName || 'writing-sample.pdf'} — ${formData.samplePdfUrl}`
      );
    }

    try {
      const res = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: [
            formData.message,
            formData.socialHandles.trim()
              ? `Social handles (review OK): ${formData.socialHandles.trim()}`
              : '',
            sampleParts.length ? `Writing sample:\n${sampleParts.join('\n')}` : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
          interests: formData.interests,
          website: formData.website,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setStatus('success');
    } catch (err: unknown) {
      console.error(err);
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to submit application. Please try again.'
      );
    }
  };

  if (status === 'success') {
    return (
      <div
        style={{
          padding: '3rem 2rem',
          backgroundColor: 'var(--surface)',
          borderRadius: '1rem',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}
      >
        <h3 className="font-serif" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '1rem' }}>
          Application received
        </h3>
        <p className="font-sans text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
          Thank you for applying to join The Cougar Chronicle. Our editorial leadership will review your
          materials and be in touch.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        textAlign: 'left',
        maxWidth: '640px',
        margin: '0 auto',
        backgroundColor: 'var(--background)',
        padding: '2rem',
        borderRadius: '0.75rem',
        border: '1px solid var(--border)',
      }}
    >
      {status === 'error' && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
          Full Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          style={fieldStyle}
        />
      </div>

      <div
        style={{
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
        }}
      >
        <div>
          <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            School Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={fieldStyle}
          />
        </div>
        <div>
          <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            style={fieldStyle}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem' }}>
          Areas of Interest *
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {APPLICATION_INTERESTS.map((interest) => {
            const isSelected = formData.interests.includes(interest);
            return (
              <label
                key={interest}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: isSelected ? 'var(--primary)' : 'var(--surface)',
                  color: isSelected ? 'white' : 'var(--foreground)',
                  padding: '0.4rem 0.9rem',
                  borderRadius: '2rem',
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleInterestToggle(interest)}
                  style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }}
                />
                <span className="font-sans text-sm" style={{ fontWeight: isSelected ? 600 : 500 }}>
                  {interest}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
          Why do you want to join?{' '}
          <span className="font-sans text-muted" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
            Optional
          </span>
        </label>
        <textarea
          rows={3}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Tell us about your experience or why you want to contribute…"
          style={{ ...fieldStyle, resize: 'vertical' }}
        />
      </div>

      {/* Optional extras — clean fields, no checkbox park */}
      <div
        style={{
          marginBottom: '1.75rem',
          borderTop: '1px solid var(--border)',
          paddingTop: '1.5rem',
        }}
      >
        <p
          className="font-sans"
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: '0.35rem',
          }}
        >
          Strengthens your application
        </p>
        <p className="font-sans text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.45 }}>
          Optional — but strongly encouraged.
        </p>

        <div style={{ marginBottom: '1.35rem' }}>
          <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
            Social handles
          </label>
          <p className="font-sans text-muted" style={{ fontSize: '0.82rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>
            Share public tags so we can confirm you&apos;re genuine (Instagram, X, LinkedIn, etc.).
          </p>
          <input
            type="text"
            value={formData.socialHandles}
            onChange={(e) => setFormData({ ...formData, socialHandles: e.target.value })}
            placeholder="@you · linkedin.com/in/you"
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
            Writing sample
          </label>
          <p className="font-sans text-muted" style={{ fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
            Homework, a class paper, a portfolio piece — Google Doc, any public URL, or a PDF.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Link2
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="url"
                value={formData.sampleUrl}
                onChange={(e) => setFormData({ ...formData, sampleUrl: e.target.value })}
                placeholder="Google Doc or portfolio URL"
                style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <span
                className="font-sans text-muted"
                style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                or
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handlePdfSelect}
                style={{ display: 'none' }}
              />

              {!formData.samplePdfUrl ? (
                <button
                  type="button"
                  disabled={uploadBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="font-sans"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: uploadBusy ? 'wait' : 'pointer',
                    opacity: uploadBusy ? 0.7 : 1,
                  }}
                >
                  <Upload size={16} style={{ color: 'var(--primary)' }} />
                  {uploadBusy ? 'Uploading PDF…' : 'Upload PDF'}
                </button>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    maxWidth: '100%',
                  }}
                >
                  <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span
                    className="font-sans"
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={formData.samplePdfName}
                  >
                    {formData.samplePdfName}
                  </span>
                  <button
                    type="button"
                    onClick={clearPdf}
                    aria-label="Remove PDF"
                    style={{
                      display: 'inline-flex',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      padding: '0.15rem',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        type="text"
        value={formData.website}
        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
        style={{ display: 'none' }}
        tabIndex={-1}
        autoComplete="off"
      />

      <button
        type="submit"
        disabled={status === 'submitting' || uploadBusy}
        className="btn btn-primary font-sans"
        style={{
          width: '100%',
          padding: '1rem',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: status === 'submitting' || uploadBusy ? 0.7 : 1,
        }}
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
}

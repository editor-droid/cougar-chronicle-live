'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    interests: [] as string[],
    socialConsent: false,
    socialHandles: '',
    portfolioUrl: '',
    website: '', // honeypot
  });

  // Prefill from ?interest=Staff%20Writer (open positions / focus chips)
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
            formData.socialConsent
              ? `Social review: yes — handles: ${formData.socialHandles || '(none listed)'}`
              : 'Social review: not requested',
            formData.portfolioUrl
              ? `Portfolio / sample: ${formData.portfolioUrl}`
              : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
          interests: formData.interests,
          website: formData.website,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

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
        <h3
          className="font-serif"
          style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '1rem' }}
        >
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
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
          }}
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
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
            }}
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
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--foreground)',
            }}
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
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleInterestToggle(interest)}
                  style={{ position: 'absolute', opacity: 0, cursor: 'pointer', height: 0, width: 0 }}
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
          Why do you want to join? (Optional)
        </label>
        <textarea
          rows={3}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Tell us about your experience or why you want to contribute..."
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--foreground)',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Encouraged extras */}
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1.15rem',
          borderRadius: '0.75rem',
          border: '1px dashed var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <p
          className="font-sans text-sm"
          style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem' }}
        >
          Encouraged (optional)
        </p>

        <label
          className="font-sans"
          style={{
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'flex-start',
            marginBottom: '0.85rem',
            cursor: 'pointer',
            fontSize: '0.95rem',
            lineHeight: 1.45,
          }}
        >
          <input
            type="checkbox"
            checked={formData.socialConsent}
            onChange={(e) => setFormData({ ...formData, socialConsent: e.target.checked })}
            style={{ marginTop: '0.2rem' }}
          />
          <span>
            You may review my public social pages to verify that I am genuine.
          </span>
        </label>

        {formData.socialConsent && (
          <div style={{ marginBottom: '0.85rem' }}>
            <label className="font-sans text-sm" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Social tags / handles
            </label>
            <input
              type="text"
              value={formData.socialHandles}
              onChange={(e) => setFormData({ ...formData, socialHandles: e.target.value })}
              placeholder="@handle, LinkedIn, etc."
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            />
          </div>
        )}

        <div>
          <label className="font-sans text-sm" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
            Writing sample or portfolio link
          </label>
          <p className="font-sans text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.4rem', lineHeight: 1.4 }}>
            A homework assignment, article draft, or portfolio is welcome — anything that shows how you write.
          </p>
          <input
            type="url"
            value={formData.portfolioUrl}
            onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
            placeholder="https://..."
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
            }}
          />
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
        disabled={status === 'submitting'}
        className="btn btn-primary font-sans"
        style={{
          width: '100%',
          padding: '1rem',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: status === 'submitting' ? 0.7 : 1,
        }}
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
}

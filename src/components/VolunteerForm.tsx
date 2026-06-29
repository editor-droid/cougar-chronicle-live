'use client';

import { useState } from 'react';

export default function VolunteerForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    interests: [] as string[],
    website: '' // honeypot
  });

  const interestOptions = ['Writing', 'Editing', 'Copywriting', 'Video Content', 'Graphic Design', 'Social Media'];

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest) 
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to submit application. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ padding: '3rem 2rem', backgroundColor: 'var(--surface)', borderRadius: '1rem', border: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h3 className="font-serif" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '1rem' }}>Application Received!</h3>
        <p className="font-sans text-muted" style={{ fontSize: '1.1rem' }}>
          Thank you for your interest in joining The Cougar Chronicle! Our editorial team will review your application and reach out to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', backgroundColor: 'var(--background)', padding: '2rem', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
      {status === 'error' && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {errorMessage}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Full Name *</label>
        <input 
          type="text" 
          required 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--foreground)' }} 
        />
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>BYU Email *</label>
          <input 
            type="email" 
            required 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--foreground)' }} 
          />
        </div>
        <div>
          <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Phone Number</label>
          <input 
            type="tel" 
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--foreground)' }} 
          />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.75rem' }}>Areas of Interest</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {interestOptions.map(interest => (
            <label key={interest} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--border)', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={formData.interests.includes(interest)}
                onChange={() => handleInterestToggle(interest)}
                style={{ accentColor: 'var(--primary)' }}
              />
              <span className="font-sans text-sm">{interest}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label className="font-sans" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Why do you want to join? (Optional)</label>
        <textarea 
          rows={4}
          value={formData.message}
          onChange={e => setFormData({...formData, message: e.target.value})}
          placeholder="Tell us about your experience or why you want to contribute..."
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--foreground)', resize: 'vertical' }} 
        />
      </div>

      {/* Honeypot field - bots fill this, humans don't see it */}
      <input 
        type="text" 
        value={formData.website}
        onChange={e => setFormData({...formData, website: e.target.value})}
        style={{ display: 'none' }} 
        tabIndex={-1} 
        autoComplete="off" 
      />

      <button 
        type="submit" 
        disabled={status === 'submitting'}
        className="btn btn-primary font-sans" 
        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: status === 'submitting' ? 0.7 : 1 }}
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
}

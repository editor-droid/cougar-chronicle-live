'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '', website: '' });
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)', textAlign: 'center' }}>
        <h3 className="font-serif" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Thank you!</h3>
        <p className="font-sans text-muted">Your message has been received. We'll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      {status === 'error' && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label className="font-sans text-sm" style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Name</label>
          <input 
            type="text" 
            required 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)' }}
          />
        </div>
        <div>
          <label className="font-sans text-sm" style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Email</label>
          <input 
            type="email" 
            required 
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label className="font-sans text-sm" style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Message</label>
        <textarea 
          required 
          rows={4} 
          value={formData.message} 
          onChange={e => setFormData({...formData, message: e.target.value})}
          style={{ width: '100%', padding: '0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)', resize: 'vertical' }}
        />
      </div>

      {/* Honeypot - invisible to users */}
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
        disabled={status === 'loading'}
        className="btn btn-primary font-sans"
        style={{ width: '100%', padding: '0.65rem' }}
      >
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function GiftUnlockButton({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [friendEmail, setFriendEmail] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);

  const create = async (mode: 'link' | 'email') => {
    if (mode === 'email' && !friendEmail.trim()) {
      toast.error('Enter your friend’s email, or use Copy link for iMessage.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          recipientEmail: mode === 'email' ? friendEmail.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not create gift');
        return;
      }

      setLink(data.url);
      if (typeof data.remaining === 'number') setRemaining(data.remaining);

      if (data.emailed) {
        toast.success(`Gift emailed to ${data.recipientEmail} (${data.remaining} left)`);
        setFriendEmail('');
      } else if (data.emailError) {
        toast.error(data.emailError);
        try {
          await navigator.clipboard.writeText(data.url);
        } catch {
          /* ignore */
        }
      } else {
        try {
          await navigator.clipboard.writeText(data.url);
          toast.success(`Gift link copied (${data.remaining} left)`);
        } catch {
          toast.success('Gift link created — copy it below');
        }
      }
    } catch {
      toast.error('Could not create gift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        padding: '0.85rem',
        border: '1px solid var(--border)',
        borderRadius: '0.5rem',
        background: 'var(--surface-hover, #faf9f5)',
      }}
    >
      <input
        type="email"
        value={friendEmail}
        onChange={(e) => setFriendEmail(e.target.value)}
        placeholder="Friend’s email (optional)"
        className="font-sans text-sm"
        style={{
          width: '100%',
          padding: '0.5rem 0.65rem',
          border: '1px solid var(--border)',
          borderRadius: '0.25rem',
          background: '#fff',
        }}
        disabled={loading}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => create('email')}
          disabled={loading}
          className="btn btn-primary font-sans text-sm"
        >
          {loading ? 'Sending…' : 'Email gift'}
        </button>
        <button
          type="button"
          onClick={() => create('link')}
          disabled={loading}
          className="btn btn-secondary font-sans text-sm"
        >
          {loading ? '…' : 'Copy link'}
        </button>
      </div>
      <p className="font-sans text-xs text-muted" style={{ margin: 0, lineHeight: 1.4 }}>
        Email keeps a copy in their inbox if they clear their browser. Link is best for iMessage.
        {remaining !== null ? ` · ${remaining} gift${remaining === 1 ? '' : 's'} left` : ''}
      </p>
      {link && (
        <input
          readOnly
          value={link}
          className="font-sans text-xs"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid var(--border)',
            borderRadius: '0.25rem',
            background: '#fff',
          }}
          onFocus={(e) => e.target.select()}
          aria-label="Gift unlock link"
        />
      )}
    </div>
  );
}

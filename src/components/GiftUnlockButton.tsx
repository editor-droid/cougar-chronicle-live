'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function GiftUnlockButton({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const create = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not create gift link');
        return;
      }
      setLink(data.url);
      try {
        await navigator.clipboard.writeText(data.url);
        toast.success(`Gift link copied (${data.remaining} left)`);
      } catch {
        toast.success('Gift link created');
      }
    } catch {
      toast.error('Could not create gift link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={create}
        disabled={loading}
        className="btn btn-secondary font-sans text-sm"
      >
        {loading ? 'Creating…' : 'Create gift unlock link'}
      </button>
      {link && (
        <input
          readOnly
          value={link}
          className="font-sans text-xs"
          style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.25rem' }}
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  );
}

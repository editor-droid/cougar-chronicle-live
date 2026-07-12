'use client';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

export default function FavoriteButton({ postId, initialFavorited }: { postId: string, initialFavorited: boolean }) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  const toggleFavorite = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      });
      if (res.status === 401) {
        toast.error('Please sign in to favorite articles.');
      } else {
        const data = await res.json();
        if (data.success) {
          setIsFavorited(data.isFavorited);
          toast.success(data.isFavorited ? 'Added to favorites!' : 'Removed from favorites.');
        }
      }
    } catch (e) {
      toast.error('Failed to update favorites.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={toggleFavorite} 
      disabled={loading}
      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart size={18} fill={isFavorited ? 'var(--primary)' : 'none'} color={isFavorited ? 'var(--primary)' : 'currentColor'} style={{ transition: 'all 0.2s', opacity: loading ? 0.5 : 1 }} />
    </button>
  );
}

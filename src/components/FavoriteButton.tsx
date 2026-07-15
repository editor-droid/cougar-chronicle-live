'use client';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  postId?: string;
  videoId?: string;
  initialFavorited: boolean;
};

export default function FavoriteButton({
  postId,
  videoId,
  initialFavorited,
}: Props) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  const toggleFavorite = async () => {
    if (!postId && !videoId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postId ? { postId } : { videoId }),
      });
      if (res.status === 401) {
        toast.error(
          videoId
            ? 'Please sign in to favorite videos.'
            : 'Please sign in to favorite articles.'
        );
      } else {
        const data = await res.json();
        if (data.success) {
          setIsFavorited(data.isFavorited);
          toast.success(
            data.isFavorited
              ? 'Added to favorites!'
              : 'Removed from favorites.'
          );
        } else if (data.error) {
          toast.error(data.error);
        }
      }
    } catch {
      toast.error('Failed to update favorites.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      disabled={loading}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: 0,
      }}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        size={18}
        fill={isFavorited ? 'var(--primary)' : 'none'}
        color={isFavorited ? 'var(--primary)' : 'currentColor'}
        style={{ transition: 'all 0.2s', opacity: loading ? 0.5 : 1 }}
      />
    </button>
  );
}

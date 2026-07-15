'use client';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import AuthPromptModal from '@/components/AuthPromptModal';

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
  const [authOpen, setAuthOpen] = useState(false);

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
        setAuthOpen(true);
        return;
      }
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
    } catch {
      toast.error('Failed to update favorites.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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

      <AuthPromptModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason={
          videoId
            ? 'Create a free account to save this video to your favorites and find it later on any device.'
            : 'Create a free account to save this story to your favorites and find it later on any device.'
        }
        onSuccess={async () => {
          // After sign-in, save the favorite immediately
          setLoading(true);
          try {
            const res = await fetch('/api/favorites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(postId ? { postId } : { videoId }),
            });
            const data = await res.json();
            if (data.success) {
              setIsFavorited(data.isFavorited);
              toast.success(
                data.isFavorited
                  ? 'Saved to your favorites!'
                  : 'Removed from favorites.'
              );
            }
          } catch {
            toast.error('Signed in — tap the heart again to save.');
          } finally {
            setLoading(false);
          }
        }}
      />
    </>
  );
}

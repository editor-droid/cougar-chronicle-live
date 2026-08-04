'use client';

import { useMemo, useState } from 'react';
import { youtubeThumbnailCandidates } from '@/lib/link-preview';

/**
 * YouTube poster with quality fallbacks + no-referrer
 * (some environments fail ytimg loads when a strict referrer is sent).
 */
export default function YoutubeThumb({
  videoId,
  alt = '',
  className,
  style,
}: {
  videoId: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const candidates = useMemo(() => youtubeThumbnailCandidates(videoId), [videoId]);
  const [idx, setIdx] = useState(0);
  const src = candidates[Math.min(idx, candidates.length - 1)];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => {
        setIdx((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        ...style,
      }}
    />
  );
}

/**
 * Best-effort public thumbnails for external links (YouTube, etc.).
 * Shared by Appearances admin + Apply page cards.
 */

/** Match every common YouTube host + path shape. */
export function youtubeIdFromUrl(raw: string): string | null {
  if (!raw?.trim()) return null;
  let input = raw.trim();
  // strip tracking junk that sometimes breaks parsers
  input = input.replace(/&amp;/gi, '&');

  try {
    const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const u = new URL(withProto);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    // youtu.be/VIDEOID
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id && /^[\w-]{11}$/.test(id)) return id;
    }

    // youtube.com, m.youtube.com, music.youtube.com, youtube-nocookie.com
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube.com')
    ) {
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;

      // /embed/ID, /shorts/ID, /live/ID, /v/ID, /e/ID
      const parts = u.pathname.split('/').filter(Boolean);
      const markers = new Set(['embed', 'shorts', 'live', 'v', 'e']);
      for (let i = 0; i < parts.length - 1; i++) {
        if (markers.has(parts[i].toLowerCase()) && /^[\w-]{11}$/.test(parts[i + 1])) {
          return parts[i + 1];
        }
      }
      // /watch/ID (rare)
      if (parts[0] === 'watch' && parts[1] && /^[\w-]{11}$/.test(parts[1])) {
        return parts[1];
      }
    }
  } catch {
    /* fall through to regex */
  }

  // Last-resort regex (handles messy pasted strings)
  const patterns = [
    /(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/|youtube-nocookie\.com\/embed\/)([\w-]{11})/i,
    /[?&]v=([\w-]{11})/i,
  ];
  for (const re of patterns) {
    const m = input.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Prefer high-res; callers should chain onError → lower tiers. */
export function youtubeThumbnailUrl(videoId: string, quality: 'max' | 'sd' | 'hq' | 'mq' = 'hq'): string {
  const file =
    quality === 'max'
      ? 'maxresdefault.jpg'
      : quality === 'sd'
        ? 'sddefault.jpg'
        : quality === 'mq'
          ? 'mqdefault.jpg'
          : 'hqdefault.jpg';
  return `https://i.ytimg.com/vi/${videoId}/${file}`;
}

/** Ordered fallbacks — maxres 404s on many videos; hq almost always works. */
export function youtubeThumbnailCandidates(videoId: string): string[] {
  return [
    youtubeThumbnailUrl(videoId, 'max'),
    youtubeThumbnailUrl(videoId, 'sd'),
    youtubeThumbnailUrl(videoId, 'hq'),
    youtubeThumbnailUrl(videoId, 'mq'),
  ];
}

export type LinkPreview = {
  kind: 'youtube' | 'favicon' | 'none';
  src: string | null;
  videoId?: string;
  /** Full fallback chain for <img onError> */
  srcCandidates?: string[];
};

export function linkPreview(url: string): LinkPreview {
  if (!url?.trim()) return { kind: 'none', src: null };
  const yt = youtubeIdFromUrl(url);
  if (yt) {
    const candidates = youtubeThumbnailCandidates(yt);
    return {
      kind: 'youtube',
      src: candidates[0],
      videoId: yt,
      srcCandidates: candidates,
    };
  }
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return {
      kind: 'favicon',
      src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(u.hostname)}&sz=128`,
    };
  } catch {
    return { kind: 'none', src: null };
  }
}

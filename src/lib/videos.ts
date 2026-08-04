import { slugifyTitle } from '@/lib/slug';

export type VideoPlatformName = 'STREAM' | 'YOUTUBE';

const YT_ID_RE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([\w-]{11})/;

export function parseYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(YT_ID_RE);
  return match?.[1] ?? null;
}

export function slugifyVideoTitle(title: string): string {
  return slugifyTitle(title, { dropStopWords: true, maxLen: 72 }) || 'video';
}

export function videoPagePath(slug: string): string {
  return `/videos/${slug}`;
}

export function videoPageUrl(slug: string): string {
  return `https://thecougarchronicle.com/videos/${slug}`;
}

/** YouTube oEmbed — title/thumbnail (no duration; needs Data API). */
export async function fetchYoutubeOEmbed(videoId: string): Promise<{
  title?: string;
  thumbnailUrl?: string;
  authorName?: string;
} | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeWatchUrl(videoId))}&format=json`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
      authorName: data.author_name,
    };
  } catch {
    return null;
  }
}

/** Cloudflare Stream video details (duration, dimensions, ready-to-stream, thumbnail). */
export async function fetchStreamDetails(uid: string): Promise<{
  durationSec?: number;
  thumbnailUrl?: string;
  readyToStream?: boolean;
  width?: number;
  height?: number;
} | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return null;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${uid}`,
      {
        headers: { Authorization: `Bearer ${apiToken}` },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.result;
    if (!result) return null;
    const duration =
      typeof result.duration === 'number' && result.duration > 0
        ? Math.round(result.duration)
        : undefined;
    const width =
      typeof result.input?.width === 'number'
        ? result.input.width
        : typeof result.meta?.width === 'number'
          ? result.meta.width
          : undefined;
    const height =
      typeof result.input?.height === 'number'
        ? result.input.height
        : typeof result.meta?.height === 'number'
          ? result.meta.height
          : undefined;
    return {
      durationSec: duration,
      thumbnailUrl: result.thumbnail || streamThumbnailUrl(uid),
      readyToStream: Boolean(result.readyToStream),
      width,
      height,
    };
  } catch {
    return null;
  }
}

/** Portrait if taller than wide; default landscape when unknown. */
export function isPortraitVideo(width?: number | null, height?: number | null): boolean {
  if (!width || !height || width <= 0 || height <= 0) return false;
  return height > width;
}

export function videoAspectRatioCss(width?: number | null, height?: number | null): string {
  if (width && height && width > 0 && height > 0) {
    return `${width} / ${height}`;
  }
  return '16 / 9';
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Account-specific Stream host (e.g. customer-xxxxx.cloudflarestream.com).
 * Mixing iframe.videodelivery.net with customer delivery domains causes CORS
 * failures in the Stream player. Set via env after first upload in CF dashboard.
 */
export function streamCustomerHost(): string {
  const raw =
    process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN ||
    process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN ||
    // Known account host from live Stream delivery (public CDN hostname)
    'customer-rid446xgvtipvf0g';
  const host = raw
    .replace(/^https?:\/\//, '')
    .replace(/\.cloudflarestream\.com.*$/i, '')
    .replace(/\/$/, '');
  return `${host}.cloudflarestream.com`;
}

export function streamEmbedUrl(
  uid: string,
  opts?: {
    /** CSS color; "transparent" hides black letterbox bars for vertical clips */
    letterboxColor?: string;
    primaryColor?: string;
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    /** false hides Stream chrome (play bar, etc.) */
    controls?: boolean;
    preload?: 'auto' | 'metadata' | 'none';
  }
): string {
  // Preferred: https://customer-xxx.cloudflarestream.com/{uid}/iframe
  const params = new URLSearchParams();
  // Transparent letterbox = no black sidebars for vertical video outside fullscreen
  params.set('letterboxColor', opts?.letterboxColor ?? 'transparent');
  if (opts?.primaryColor) {
    params.set('primaryColor', opts.primaryColor);
  }
  if (opts?.autoplay) params.set('autoplay', 'true');
  if (opts?.muted) params.set('muted', 'true');
  if (opts?.loop) params.set('loop', 'true');
  if (opts?.controls === false) params.set('controls', 'false');
  if (opts?.preload) params.set('preload', opts.preload);
  return `https://${streamCustomerHost()}/${uid}/iframe?${params.toString()}`;
}

export function streamThumbnailUrl(uid: string): string {
  return `https://${streamCustomerHost()}/${uid}/thumbnails/thumbnail.jpg`;
}

export function streamContentUrl(uid: string): string {
  return `https://${streamCustomerHost()}/${uid}/manifest/video.m3u8`;
}

/** Prefer fresh customer-domain embed for Stream rows (fixes legacy videodelivery.net URLs). */
export function resolveStreamEmbedUrl(
  video: {
    platform: string;
    externalId: string;
    embedUrl: string;
  },
  opts?: Parameters<typeof streamEmbedUrl>[1]
): string {
  if (video.platform === 'STREAM' && video.externalId) {
    return streamEmbedUrl(video.externalId, opts);
  }
  return video.embedUrl;
}

export function resolveStreamThumbnailUrl(video: {
  platform: string;
  externalId: string;
  thumbnailUrl: string | null;
}): string | null {
  if (video.platform === 'STREAM' && video.externalId) {
    return streamThumbnailUrl(video.externalId);
  }
  return video.thumbnailUrl;
}

/** ISO 8601 duration, e.g. PT1M30S */
export function formatIsoDuration(seconds: number | null | undefined): string | undefined {
  if (seconds == null || seconds <= 0 || !Number.isFinite(seconds)) return undefined;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  let out = 'PT';
  if (h) out += `${h}H`;
  if (m) out += `${m}M`;
  if (sec || (!h && !m)) out += `${sec}S`;
  return out;
}

export function formatDurationLabel(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export type PublicVideo = {
  id: string;
  title: string;
  slug?: string;
  description: string | null;
  seoTitle?: string | null;
  seoKeywords?: string | null;
  platform: VideoPlatformName;
  externalId: string;
  embedUrl: string;
  thumbnailUrl: string | null;
  contentUrl: string | null;
  durationSec: number | null;
  publishedAt: Date | string;
};

export function buildVideoObjectJsonLd(video: PublicVideo, pageUrl?: string) {
  const duration = formatIsoDuration(video.durationSec);
  const resolvedUrl =
    pageUrl || (video.slug ? videoPageUrl(video.slug) : undefined);
  const keywords = video.seoKeywords
    ? video.seoKeywords.split(',').map((k) => k.trim()).filter(Boolean)
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.seoTitle || video.title,
    description: video.description || video.title,
    thumbnailUrl: video.thumbnailUrl ? [video.thumbnailUrl] : undefined,
    uploadDate: new Date(video.publishedAt).toISOString(),
    duration,
    embedUrl: video.embedUrl,
    contentUrl: video.contentUrl || video.embedUrl,
    url: resolvedUrl,
    mainEntityOfPage: resolvedUrl,
    isFamilyFriendly: true,
    keywords: keywords?.length ? keywords : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'The Cougar Chronicle',
      logo: {
        '@type': 'ImageObject',
        url: 'https://thecougarchronicle.com/icon.png',
      },
    },
  };
}

export function buildVideoBreadcrumbJsonLd(video: { title: string; slug: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://thecougarchronicle.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Videos',
        item: 'https://thecougarchronicle.com/videos',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: video.title,
        item: videoPageUrl(video.slug),
      },
    ],
  };
}

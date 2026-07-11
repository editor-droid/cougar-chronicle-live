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
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'video';
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

/** Cloudflare Stream video details (duration, ready-to-stream, thumbnail). */
export async function fetchStreamDetails(uid: string): Promise<{
  durationSec?: number;
  thumbnailUrl?: string;
  readyToStream?: boolean;
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
    return {
      durationSec: duration,
      thumbnailUrl: result.thumbnail || streamThumbnailUrl(uid),
      readyToStream: Boolean(result.readyToStream),
    };
  } catch {
    return null;
  }
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

export function streamEmbedUrl(uid: string): string {
  // Preferred: https://customer-xxx.cloudflarestream.com/{uid}/iframe
  return `https://${streamCustomerHost()}/${uid}/iframe`;
}

export function streamThumbnailUrl(uid: string): string {
  return `https://${streamCustomerHost()}/${uid}/thumbnails/thumbnail.jpg`;
}

export function streamContentUrl(uid: string): string {
  return `https://${streamCustomerHost()}/${uid}/manifest/video.m3u8`;
}

/** Prefer fresh customer-domain embed for Stream rows (fixes legacy videodelivery.net URLs). */
export function resolveStreamEmbedUrl(video: {
  platform: string;
  externalId: string;
  embedUrl: string;
}): string {
  if (video.platform === 'STREAM' && video.externalId) {
    return streamEmbedUrl(video.externalId);
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

import { parseYoutubeId, streamEmbedUrl, youtubeEmbedUrl } from './videos';

export type EmbedProvider = 'youtube' | 'instagram' | 'stream';

export type ParsedEmbed = {
  provider: EmbedProvider;
  /** Final iframe src */
  embedSrc: string;
  aspectRatio: string;
  /** Original or normalized watch URL for reference */
  sourceUrl?: string;
  id?: string;
};

/** Cloudflare Stream uid (32-char hex) or UUID with dashes. */
const STREAM_UID_RE =
  /(?:^|\/)([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/|$|\?)/i;

export function parseStreamUid(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-f0-9]{32}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      trimmed
    )
  ) {
    return trimmed.toLowerCase();
  }
  const m = trimmed.match(STREAM_UID_RE);
  return m?.[1]?.toLowerCase() ?? null;
}

export function parseInstagramEmbedUrl(input: string): string | null {
  const trimmed = input.trim().replace(/\/$/, '');
  // Already an embed URL
  if (/instagram\.com\/(p|reel|tv)\/[\w-]+\/embed/i.test(trimmed)) {
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }
  const m = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(p|reel|tv)\/([\w-]+)/i
  );
  if (!m) return null;
  return `https://www.instagram.com/${m[1]}/${m[2]}/embed`;
}

/**
 * Parse a pasted YouTube / Instagram / Cloudflare Stream URL (or Stream uid)
 * into a safe iframe embed.
 */
export function parseVideoEmbedInput(input: string): ParsedEmbed | null {
  const raw = input.trim();
  if (!raw) return null;

  // YouTube
  const ytId = parseYoutubeId(raw);
  if (ytId && !/cloudflarestream|videodelivery|instagram/i.test(raw)) {
    // Avoid false positives if somehow mixed
    if (
      /youtube\.com|youtu\.be|^[\w-]{11}$/i.test(raw) ||
      ytId.length === 11
    ) {
      return {
        provider: 'youtube',
        embedSrc: youtubeEmbedUrl(ytId),
        aspectRatio: '16 / 9',
        sourceUrl: raw.startsWith('http')
          ? raw
          : `https://www.youtube.com/watch?v=${ytId}`,
        id: ytId,
      };
    }
  }

  // Instagram
  const ig = parseInstagramEmbedUrl(raw);
  if (ig) {
    return {
      provider: 'instagram',
      embedSrc: ig,
      aspectRatio: '4 / 5',
      sourceUrl: raw,
    };
  }

  // Cloudflare Stream (iframe URL, watch URL, or raw uid)
  if (
    /cloudflarestream\.com|videodelivery\.net/i.test(raw) ||
    parseStreamUid(raw)
  ) {
    const uid = parseStreamUid(raw);
    if (uid) {
      // If they already pasted a full iframe URL with query params, prefer rebuilding
      // for correct customer host + transparent letterbox.
      const alreadyIframe =
        /cloudflarestream\.com\/[^/]+\/iframe|videodelivery\.net\/[^/?]+/i.test(
          raw
        );
      const embedSrc = alreadyIframe && raw.includes('iframe')
        ? // Normalize to our customer host when possible
          streamEmbedUrl(uid, { letterboxColor: 'transparent', primaryColor: '#1b2253' })
        : streamEmbedUrl(uid, {
            letterboxColor: 'transparent',
            primaryColor: '#1b2253',
          });
      return {
        provider: 'stream',
        embedSrc,
        aspectRatio: '16 / 9',
        sourceUrl: raw.startsWith('http') ? raw : undefined,
        id: uid,
      };
    }
  }

  // Pure YouTube id (11 chars) — after stream checks
  if (/^[\w-]{11}$/.test(raw)) {
    return {
      provider: 'youtube',
      embedSrc: youtubeEmbedUrl(raw),
      aspectRatio: '16 / 9',
      id: raw,
    };
  }

  return null;
}

export function detectEmbedProviderHint(
  input: string
): EmbedProvider | 'unknown' {
  const u = input.toLowerCase();
  if (/instagram\.com/.test(u)) return 'instagram';
  if (/youtube\.com|youtu\.be/.test(u)) return 'youtube';
  if (/cloudflarestream|videodelivery/.test(u)) return 'stream';
  if (parseStreamUid(input) && !parseYoutubeId(input)) return 'stream';
  return 'unknown';
}

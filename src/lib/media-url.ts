/**
 * R2 media URLs: production serves via custom domain (cdn…), not pub-*.r2.dev.
 * Old posts still store the r2.dev host; rewrite for display until DB is migrated.
 */

const LEGACY_R2_HOST_RE = /https?:\/\/pub-[a-f0-9]+\.r2\.dev/gi;

/** Canonical public media base (no trailing slash). */
export function publicMediaBase(): string {
  const fromEnv = (
    process.env.CLOUDFLARE_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL ||
    'https://cdn.thecougarchronicle.com'
  ).trim();
  return fromEnv.replace(/\/$/, '') || 'https://cdn.thecougarchronicle.com';
}

/** Rewrite a single media URL from legacy r2.dev → CDN custom domain. */
export function rewriteMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (!/pub-[a-f0-9]+\.r2\.dev/i.test(url)) return url;
  return url.replace(LEGACY_R2_HOST_RE, publicMediaBase());
}

/** Rewrite all legacy R2 hosts inside HTML (img src, inline content, etc.). */
export function rewriteMediaUrlsInHtml(html: string): string {
  if (!html || !/pub-[a-f0-9]+\.r2\.dev/i.test(html)) return html;
  return html.replace(LEGACY_R2_HOST_RE, publicMediaBase());
}

function isOurMediaUrl(src: string): boolean {
  return /cdn\.thecougarchronicle\.com|pub-[a-f0-9]+\.r2\.dev|r2\.cloudflarestorage\.com/i.test(
    src
  );
}

/**
 * Next.js /_next/image only accepts these widths (deviceSizes + imageSizes defaults).
 * Arbitrary values like 1400 return 400: `"w" parameter (width) of 1400 is not allowed`.
 */
const NEXT_IMAGE_WIDTHS = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
] as const;

function nearestNextImageWidth(desired: number): number {
  let best: number = NEXT_IMAGE_WIDTHS[NEXT_IMAGE_WIDTHS.length - 1];
  let bestDiff = Infinity;
  for (const w of NEXT_IMAGE_WIDTHS) {
    // Prefer same or larger than desired for sharpness
    const diff = w >= desired ? w - desired : desired - w + 5000;
    if (diff < bestDiff) {
      bestDiff = diff;
      best = w;
    }
  }
  // Article body images: never go tiny
  if (best < 640) return 1080;
  return best;
}

/**
 * Point article body <img> tags through same-origin Next.js image optimizer.
 * Hero images already use next/image; body HTML used raw cdn URLs, so phones on
 * broken home DNS (cdn → Railway) only got a cert error on in-article images.
 */
export function rewriteArticleImagesThroughOptimizer(html: string): string {
  if (!html || !/<img\b/i.test(html)) return html;

  return html.replace(
    /<img\b([^>]*?)\bsrc=(["'])([^"']+)\2([^>]*)>/gi,
    (full, pre: string, quote: string, src: string, post: string) => {
      if (!src || src.startsWith('/_next/image') || src.startsWith('data:')) {
        return full;
      }
      // Decode HTML entities that TipTap may leave in attributes
      const decoded = src
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      if (!isOurMediaUrl(decoded)) return full;

      const clean = rewriteMediaUrl(decoded);
      // data-width is display px; request 2× for retina, then snap to Next allowed list
      const widthMatch =
        full.match(/\bdata-width=["']?(\d+)/i) ||
        full.match(/\bwidth:\s*(\d+)px/i);
      const desired = widthMatch
        ? parseInt(widthMatch[1], 10) * 2
        : 1920;
      const w = nearestNextImageWidth(desired);
      const optimized = `/_next/image?url=${encodeURIComponent(clean)}&w=${w}&q=75`;
      return `<img${pre}src=${quote}${optimized}${quote}${post}>`;
    }
  );
}

/** Full pass for published article HTML: CDN host + same-origin image srcs. */
export function prepareArticleHtmlImages(html: string): string {
  return rewriteArticleImagesThroughOptimizer(rewriteMediaUrlsInHtml(html));
}

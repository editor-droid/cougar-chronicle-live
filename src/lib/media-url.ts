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

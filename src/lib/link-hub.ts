import { withUtm } from '@/lib/email';

export const LINK_HUB_PATH = '/links';

/** SiteSetting key for automated latest-story card */
export const LINK_HUB_SHOW_LATEST_KEY = 'linkHub.showLatestStory';

export function linkHubTrackedUrl(
  href: string,
  opts?: { campaign?: string | null; content?: string | null }
): string {
  const absolute =
    href.startsWith('http://') || href.startsWith('https://')
      ? href
      : `https://thecougarchronicle.com${href.startsWith('/') ? '' : '/'}${href}`;

  const tagged = withUtm(absolute, {
    source: 'linkhub',
    medium: 'bio',
    campaign: opts?.campaign?.trim() || 'profile',
  });

  if (!opts?.content?.trim()) return tagged;

  try {
    const u = new URL(tagged);
    u.searchParams.set('utm_content', opts.content.trim().slice(0, 80));
    return u.toString();
  } catch {
    return tagged;
  }
}

/**
 * Fetch Open Graph / Twitter image + title from a public URL.
 * Returns absolute image URL when found.
 */
export async function fetchPagePreview(pageUrl: string): Promise<{
  title?: string;
  imageUrl?: string;
  error?: string;
}> {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { error: 'Only http(s) URLs supported' };
    }
  } catch {
    return { error: 'Invalid URL' };
  }

  // Prefer our own article images without scraping
  if (
    parsed.hostname.replace(/^www\./, '') === 'thecougarchronicle.com' ||
    parsed.hostname === 'localhost'
  ) {
    // Caller may resolve from DB; still try OG for completeness
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CougarChronicleLinkHub/1.0 (+https://thecougarchronicle.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      next: { revalidate: 0 },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { error: `Page returned ${res.status}` };
    }

    const html = await res.text();
    // Limit parse size
    const slice = html.slice(0, 200_000);

    const meta = (prop: string) => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        'i'
      );
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
        'i'
      );
      return slice.match(re)?.[1] || slice.match(re2)?.[1];
    };

    const titleTag = slice.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const title =
      meta('og:title') || meta('twitter:title') || titleTag || undefined;
    let imageUrl =
      meta('og:image') || meta('twitter:image') || meta('twitter:image:src') || undefined;

    if (imageUrl) {
      try {
        imageUrl = new URL(imageUrl, parsed).toString();
      } catch {
        imageUrl = undefined;
      }
    }

    return { title, imageUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Fetch failed';
    return { error: msg.includes('abort') ? 'Timed out fetching page' : msg };
  }
}

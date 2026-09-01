export type GaEventParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    track?: (event: string, params?: GaEventParams) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** No-ops when gtag has not loaded yet (viral bounces, ad blockers). */
export function track(event: string, params?: GaEventParams): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', event, params);
}

if (typeof window !== 'undefined') {
  window.track = track;
}

/**
 * GA4 content grouping from the public pathname.
 * Section indexes and nested routes map to the first segment; unknown flat slugs are articles.
 */
export function contentGroupFromPath(pathname: string): string {
  if (!pathname || pathname === '/') return 'home';
  const grouped = pathname.match(
    /^\/(news|opinion|campus|politics|family|faith|videos|print-edition)(\/|$)/
  );
  if (grouped?.[1]) return grouped[1];
  if (pathname.startsWith('/byu-')) return 'byu-hub';
  return 'article';
}

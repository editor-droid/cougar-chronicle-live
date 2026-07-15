export type DescriptionLink = {
  href: string;
  kind: 'article' | 'video' | 'external';
  /** Path slug when internal Chronicle content */
  slug?: string;
};

export type ParsedVideoDescription = {
  /** Prose without raw “Featured in:” URL lines */
  body: string;
  links: DescriptionLink[];
};

function classifyUrl(href: string): DescriptionLink {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'thecougarchronicle.com' || host === 'localhost') {
      const article = u.pathname.match(
        /^\/(article|premium-article|print-edition)\/([^/]+)\/?$/
      );
      if (article) {
        return { href: u.pathname, kind: 'article', slug: article[2] };
      }
      const video = u.pathname.match(/^\/videos\/([^/]+)\/?$/);
      if (video) {
        return { href: `/videos/${video[1]}`, kind: 'video', slug: video[1] };
      }
    }
    return { href, kind: 'external' };
  } catch {
    return { href, kind: 'external' };
  }
}

/**
 * Split plain video description into clean body copy + structured links
 * (so we can render buttons instead of raw URLs).
 */
export function parseVideoDescription(
  text: string | null | undefined
): ParsedVideoDescription {
  if (!text?.trim()) return { body: '', links: [] };

  const links: DescriptionLink[] = [];
  const seen = new Set<string>();

  const add = (rawUrl: string) => {
    const cleaned = rawUrl.replace(/[.,;:!?)]+$/, '');
    const link = classifyUrl(cleaned);
    const key = link.href;
    if (seen.has(key)) return;
    seen.add(key);
    links.push(link);
  };

  // Lines like "Featured in: https://…"
  let body = text.replace(
    /(?:^|\n)\s*Featured in:\s*(https?:\/\/[^\s]+)/gi,
    (_m, url: string) => {
      add(url);
      return '';
    }
  );

  // Remaining bare Chronicle article/video URLs → buttons, strip from body
  body = body.replace(
    /https?:\/\/(?:www\.)?thecougarchronicle\.com\/(?:article|premium-article|print-edition|videos)\/[^\s]+/gi,
    (url) => {
      add(url);
      return '';
    }
  );

  // Other http(s) URLs left in prose → external link chips
  body = body.replace(/(https?:\/\/[^\s]+)/gi, (url) => {
    add(url);
    return '';
  });

  body = body
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  return { body, links };
}

export function defaultLinkLabel(link: DescriptionLink, title?: string | null): string {
  if (title?.trim()) {
    if (link.kind === 'article') return `Read: ${title.trim()}`;
    if (link.kind === 'video') return `Watch: ${title.trim()}`;
    return title.trim();
  }
  if (link.kind === 'article') return 'Read the full article';
  if (link.kind === 'video') return 'Watch related video';
  try {
    return new URL(link.href).hostname.replace(/^www\./, '');
  } catch {
    return 'Open link';
  }
}

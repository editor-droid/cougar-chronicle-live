import { slugifyTitle } from '@/lib/slug';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

function headingId(text: string): string {
  return slugifyTitle(text, { dropStopWords: false, maxLen: 80 });
}

/**
 * Parse headings (h2, h3, h4) from raw HTML content.
 * Returns an array of { id, text, level } objects.
 */
export function extractHeadings(html: string): TocItem[] {
  const regex = /<h([2-4])[^>]*>(.*?)<\/h[2-4]>/gi;
  const headings: TocItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    // Strip HTML tags from heading text
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (!text) continue;
    headings.push({ id: headingId(text), text, level });
  }

  return headings;
}

/**
 * Inject id attributes into heading tags in the HTML content
 * so the TOC links can scroll to them.
 */
export function injectHeadingIds(html: string): string {
  if (!html) return '';
  const regex = /<h([2-4])([^>]*)>(.*?)<\/h([2-4])>/gi;
  return html.replace(regex, (_match, level, attrs, content, closeLevel) => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    if (!text) return _match;
    const id = headingId(text);
    // Preserve existing attributes but add/replace id
    const cleanAttrs = attrs.replace(/\s*id="[^"]*"/g, '');
    return `<h${level}${cleanAttrs} id="${id}">${content}</h${closeLevel}>`;
  });
}

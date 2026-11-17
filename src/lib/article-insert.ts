/** Insert the in-article newsletter after this many paragraphs when they exist. */
export const ARTICLE_NEWSLETTER_AFTER_PARAGRAPH = 4;

/** Character offset just after the nth `</p>` (1-based). Null when there are fewer. */
export function offsetAfterNthParagraph(html: string, paragraph: number): number | null {
  if (!html || paragraph < 1) return null;
  const re = /<\/p>/gi;
  let seen = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    seen += 1;
    if (seen === paragraph) return match.index + match[0].length;
  }
  return null;
}

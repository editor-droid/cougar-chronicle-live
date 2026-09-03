import type { Editor } from '@tiptap/core';
import { getMarkRange } from '@tiptap/core';

/** Google Docs wraps every copied/exported href in a redirector. */
export function unwrapGoogleRedirect(href: string): string {
  const trimmed = String(href || '').trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    if (
      (u.hostname === 'www.google.com' || u.hostname === 'google.com') &&
      (u.pathname === '/url' || u.pathname === '/url/')
    ) {
      const q = u.searchParams.get('q');
      if (q) return q;
    }
  } catch {
    /* keep original */
  }
  return trimmed;
}

export function formatHref(url: string): string {
  const trimmed = unwrapGoogleRedirect(url.trim());
  if (!trimmed) return '';
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/** Rewrite href="…" in HTML (paste + Docs export). */
export function rewriteHtmlAnchors(html: string): string {
  if (!html || !/href=/i.test(html)) return html;
  return html.replace(/\bhref=(["'])(.*?)\1/gi, (_m, quote: string, href: string) => {
    const decoded = href.replace(/&amp;/g, '&');
    const next = unwrapGoogleRedirect(decoded);
    return `href=${quote}${next.replace(/&/g, '&amp;')}${quote}`;
  });
}

function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[\p{L}\p{N}_-]/u.test(ch);
}

export type LinkRange = { from: number; to: number };

/** Snapshot the range that should receive the link — call this BEFORE the URL field steals focus. */
export function captureLinkRange(editor: Editor): LinkRange {
  const { state } = editor;
  const { from, to, empty, $from } = state.selection;
  const linkType = state.schema.marks.link;

  if (linkType) {
    const mark = $from.marks().find((m) => m.type === linkType);
    if (mark) {
      const range = getMarkRange($from, linkType, { href: mark.attrs.href });
      if (range) return { from: range.from, to: range.to };
    }
  }

  if (!empty) return { from, to };

  const parent = $from.parent;
  if (!parent.isTextblock) return { from, to };
  const text = parent.textContent;
  const offset = $from.parentOffset;
  let start = offset;
  let end = offset;
  while (start > 0 && isWordChar(text[start - 1])) start -= 1;
  while (end < text.length && isWordChar(text[end])) end += 1;
  if (start === end) return { from, to };
  const base = $from.start();
  return { from: base + start, to: base + end };
}

/**
 * Apply a hyperlink only to `range` (captured before the URL input focused).
 * TipTap's setLink uses the live selection, which often becomes the whole
 * document after the editor blurs — that rewrites every existing link.
 */
export function applyLink(editor: Editor, rawHref: string, range: LinkRange | null | undefined) {
  const href = formatHref(rawHref);
  if (!href) return;

  const r = range ?? captureLinkRange(editor);
  let { from, to } = r;

  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  const size = editor.state.doc.content.size;
  from = Math.max(1, Math.min(from, size));
  to = Math.max(from, Math.min(to, size));

  if (from === to) {
    const safe = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    editor.chain().focus().insertContent(`<a href="${safe}">${safe}</a>`).run();
    return;
  }

  editor
    .chain()
    .focus()
    .setTextSelection({ from, to })
    .setLink({ href, target: '_blank' })
    .run();
}

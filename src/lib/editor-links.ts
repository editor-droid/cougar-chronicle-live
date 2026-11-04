import type { Editor } from '@tiptap/core';
import { getMarkRange } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

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

/** Drop characters Word and Google Docs leave on a copied URL. */
function cleanUrlInput(url: string): string {
  return String(url || '')
    .replace(/[\u200B-\u200D\uFEFF\u2060\u00A0]/g, '')
    .trim()
    .replace(/^[<"'“”‘’]+|[>"'“”‘’]+$/g, '')
    .trim();
}

export function formatHref(url: string): string {
  const trimmed = unwrapGoogleRedirect(cleanUrlInput(url));
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
    const next = formatHref(decoded) || unwrapGoogleRedirect(decoded);
    return `href=${quote}${next.replace(/&/g, '&amp;')}${quote}`;
  });
}

function isWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  return /[\p{L}\p{N}_-]/u.test(ch);
}

export type LinkRange = { from: number; to: number };

type LinkSpan = LinkRange & { href: string };

function clampRange(doc: PMNode, range: LinkRange): LinkRange {
  const size = doc.content.size;
  let { from, to } = range;
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  from = Math.max(0, Math.min(from, size));
  to = Math.max(from, Math.min(to, size));
  return { from, to };
}

/**
 * The one anchor that contains `pos`.
 * Non-inclusive link marks are absent from `$pos.marks()` exactly at the
 * start boundary, so the following text node has to be checked too.
 */
export function linkRangeAt(doc: PMNode, pos: number): LinkRange | null {
  const linkType = doc.type.schema.marks.link;
  if (!linkType) return null;
  const size = doc.content.size;
  const clamped = Math.max(0, Math.min(pos, size));
  const $pos = doc.resolve(clamped);
  const here = $pos.marks().find((m) => m.type === linkType);
  const before = $pos.nodeBefore ? linkType.isInSet($pos.nodeBefore.marks) : undefined;
  const after = $pos.nodeAfter ? linkType.isInSet($pos.nodeAfter.marks) : undefined;
  const mark = here || after || before;
  if (!mark) return null;

  let $mark = $pos;
  if (!here) {
    const inside = after ? Math.min(size, clamped + 1) : Math.max(0, clamped - 1);
    $mark = doc.resolve(inside);
  }
  const range = getMarkRange($mark, linkType, { href: mark.attrs.href });
  if (!range) return null;
  return { from: range.from, to: range.to };
}

function linkSpansBetween(doc: PMNode, from: number, to: number): LinkSpan[] {
  const linkType = doc.type.schema.marks.link;
  if (!linkType || from >= to) return [];
  const spans: LinkSpan[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const mark = linkType.isInSet(node.marks);
    if (!mark) return;
    const href = String(mark.attrs.href || '');
    const start = pos;
    const end = pos + node.nodeSize;
    const prev = spans[spans.length - 1];
    if (prev && prev.href === href && prev.to === start) {
      prev.to = end;
      return;
    }
    spans.push({ href, from: start, to: end });
  });
  return spans;
}

/**
 * Range that may receive a new href.
 * A selection the writer actually made is linked as they highlighted it,
 * even when that highlight already contains other anchors.
 * A select-all is not. The URL field blurs the editor and Chrome often
 * turns that blur into a selection of the whole article; painting it would
 * point every existing link at the new URL.
 */
export function linkEditRange(doc: PMNode, range: LinkRange): LinkRange | null {
  const requested = clampRange(doc, range);
  const { from, to } = requested;
  if (from === to) return linkRangeAt(doc, from) ?? requested;

  const spans = linkSpansBetween(doc, from, to);
  const size = doc.content.size;
  const coversDocument = from <= 1 && to >= size - 1;
  const coversAlmostAll = size > 0 && (to - from) / size >= 0.9;

  if (spans.length === 1) {
    const only = spans[0];
    if (from >= only.from && to <= only.to) return { from: only.from, to: only.to };
  }

  if (spans.length === 0) return requested;

  // Accidental select-all: do not retarget the article's existing links.
  if (coversDocument || (coversAlmostAll && spans.length > 1)) {
    return null;
  }

  return requested;
}

/** Snapshot the range that should receive the link — call this BEFORE focus leaves the editor. */
export function captureLinkRange(editor: Editor): LinkRange {
  const { state } = editor;
  const { from, to, empty, $from } = state.selection;
  const atCaret = linkRangeAt(state.doc, from);
  if (atCaret && (empty || (from >= atCaret.from && to <= atCaret.to))) return atCaret;

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

function linkMarkAttrs(href: string) {
  return { href, target: '_blank', rel: 'noopener noreferrer' };
}

/**
 * Apply a hyperlink only to one anchor.
 * The URL field blurs the editor, and the live selection often becomes the
 * whole document — applying that range would point every link at the new URL.
 */
export function applyLink(editor: Editor, rawHref: string, range: LinkRange | null | undefined) {
  const href = formatHref(rawHref);
  if (!href) return false;

  const requested = range ?? captureLinkRange(editor);
  const target = linkEditRange(editor.state.doc, requested);
  if (!target) return false;

  const { from, to } = target;
  const linkType = editor.state.schema.marks.link;
  if (!linkType) return false;

  if (from === to) {
    const safe = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return editor
      .chain()
      .insertContent(
        `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`
      )
      .focus()
      .run();
  }

  return editor
    .chain()
    .command(({ tr }) => {
      tr.removeMark(from, to, linkType);
      tr.addMark(from, to, linkType.create(linkMarkAttrs(href)));
      tr.setSelection(TextSelection.create(tr.doc, from, to));
      tr.setMeta('preventAutolink', true);
      return true;
    })
    .focus()
    .run();
}

/** Remove only the anchor in `range`, not every link in the document. */
export function removeLink(editor: Editor, range: LinkRange | null | undefined) {
  const linkType = editor.state.schema.marks.link;
  if (!linkType) return false;
  const requested = range ?? captureLinkRange(editor);
  const target = linkEditRange(editor.state.doc, requested);
  if (!target || target.from === target.to) return false;
  const spans = linkSpansBetween(editor.state.doc, target.from, target.to);
  if (spans.length === 0) return false;

  return editor
    .chain()
    .command(({ tr }) => {
      tr.removeMark(target.from, target.to, linkType);
      tr.removeStoredMark(linkType);
      tr.setMeta('preventAutolink', true);
      return true;
    })
    .focus()
    .run();
}

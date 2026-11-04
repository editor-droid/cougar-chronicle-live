/**
 * Runs before `next build`. Writers hit two failures more than once:
 * highlighting a sentence that already had links did nothing (or rewrote
 * only the first link), and the toolbar rejected URLs that did not already
 * start with https://. A select-all must still refuse to retarget every
 * link in the article.
 */
import { readFileSync } from 'node:fs';
import { Schema, type Node as PMNode } from '@tiptap/pm/model';
import {
  formatHref,
  linkEditRange,
  rewriteHtmlAnchors,
  type LinkRange,
} from '../src/lib/editor-links';

const failures: string[] = [];

function check(cond: unknown, message: string) {
  if (cond) {
    console.log(`ok  ${message}`);
    return;
  }
  failures.push(message);
  console.error(`FAIL  ${message}`);
}

function same(actual: LinkRange | null, expected: LinkRange | null): boolean {
  if (!actual || !expected) return actual === expected;
  return actual.from === expected.from && actual.to === expected.to;
}

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' },
  },
  marks: {
    link: {
      attrs: {
        href: { default: null },
        target: { default: null },
        rel: { default: null },
      },
      inclusive: false,
    },
  },
});

type Part = string | { text: string; href: string };

function story(parts: Part[]): PMNode {
  const link = schema.marks.link;
  return schema.node('doc', null, [
    schema.node(
      'paragraph',
      null,
      parts.map((part) =>
        typeof part === 'string'
          ? schema.text(part)
          : schema.text(part.text, [link.create({ href: part.href })])
      )
    ),
  ]);
}

function posOf(doc: PMNode, word: string): LinkRange {
  let found: LinkRange | null = null;
  doc.descendants((node, pos) => {
    if (found || !node.isText || !node.text) return;
    const index = node.text.indexOf(word);
    if (index >= 0) found = { from: pos + index, to: pos + index + word.length };
  });
  if (!found) throw new Error(`missing “${word}”`);
  return found;
}

const doc = story([
  'The Chronicle ',
  { text: 'exposed', href: 'https://example.com/one' },
  ' this group and later ',
  { text: 'published', href: 'https://example.com/two' },
  ' the audio.',
]);

const exposed = posOf(doc, 'exposed');
const published = posOf(doc, 'published');
const group = posOf(doc, 'group');
const phrase = { from: exposed.from, to: published.to };
const fromTheStart = { from: posOf(doc, 'The').from, to: published.to };

check(
  same(linkEditRange(doc, group), group),
  'a plain word becomes a link and leaves neighboring links alone'
);
check(
  same(linkEditRange(doc, phrase), phrase),
  'a highlight that already contains links is linked in full'
);
check(
  same(linkEditRange(doc, fromTheStart), fromTheStart),
  'a highlight that starts on plain text and crosses links is linked in full'
);
check(
  same(linkEditRange(doc, exposed), exposed),
  'editing one link does not spill onto the next'
);
check(
  same(linkEditRange(doc, { from: exposed.from + 2, to: exposed.from + 2 }), exposed),
  'the caret inside a link edits that link only'
);
check(
  linkEditRange(doc, { from: 0, to: doc.content.size }) === null,
  'selecting the whole article does not retarget every link'
);

const filler = 'word '.repeat(80);
const long = story([
  filler,
  { text: 'one', href: 'https://a.example/one' },
  ' mid ',
  { text: 'two', href: 'https://b.example/two' },
  filler,
]);
const wideTo = Math.max(posOf(long, 'two').to, Math.floor(long.content.size * 0.95));
check(
  linkEditRange(long, { from: 0, to: wideTo }) === null,
  'a near-select-all that covers several links is refused'
);

check(formatHref('www.ksl.com/article/1') === 'https://www.ksl.com/article/1', 'www. URLs gain https://');
check(formatHref('ksl.com/article/1') === 'https://ksl.com/article/1', 'bare domains gain https://');
check(
  formatHref('/david-chappell-linked-to-extremist-group') === '/david-chappell-linked-to-extremist-group',
  'in-site /story paths stay relative'
);
check(formatHref('\u200bhttps://example.com/zw') === 'https://example.com/zw', 'Docs zero-width characters are stripped');
check(formatHref('"https://example.com/a"') === 'https://example.com/a', 'wrapped quotes are stripped');
check(formatHref('mailto:desk@thecougarchronicle.com') === 'mailto:desk@thecougarchronicle.com', 'mailto links stay mailto');
check(formatHref('   ') === '', 'an empty link is rejected');
check(
  formatHref('https://www.google.com/url?q=https://uvu.edu/news&sa=D&source=editors') === 'https://uvu.edu/news',
  'Google Docs redirect URLs unwrap'
);
check(
  rewriteHtmlAnchors(
    '<p><a href="https://www.google.com/url?q=https://uvu.edu/news&amp;sa=D">one</a></p>'
  ).includes('href="https://uvu.edu/news"'),
  'pasted Docs HTML keeps the real href'
);

const editorSrc = readFileSync(new URL('../src/components/RichTextEditor.tsx', import.meta.url), 'utf8');
const linkBranch = editorSrc.slice(editorSrc.indexOf('if (isLink)'), editorSrc.indexOf('if (isTweet)'));
check(linkBranch.includes('formatHref(trimmed)'), 'the toolbar link button formats the URL');
check(linkBranch.includes('onInsertLink(href)'), 'the toolbar applies the formatted URL');
check(!linkBranch.includes('new URL'), 'the toolbar does not reject URLs with new URL()');

if (failures.length) {
  console.error(`\n${failures.length} editor-link check(s) failed.`);
  process.exit(1);
}

console.log('\neditor links ok');

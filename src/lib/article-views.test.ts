import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ARTICLE_VIEW_MAX_ENTRIES,
  ARTICLE_VIEW_WINDOW_SEC,
  decideArticleView,
  isObviousBot,
  isPrefetchRequest,
  parseViewCookie,
} from './article-views';

const NOW = 1_700_000_000;
const POST_A = 'cviewcounttestarticle01';
const POST_B = 'cviewcounttestarticle02';

function decide(
  overrides: Partial<Parameters<typeof decideArticleView>[0]> = {}
) {
  return decideArticleView({
    postId: POST_A,
    cookie: null,
    userAgent: 'Mozilla/5.0 (compatible; Reader)',
    prefetch: false,
    crossSite: false,
    role: null,
    nowSec: NOW,
    ...overrides,
  });
}

describe('decideArticleView', () => {
  it('counts a first visit and remembers the article for 24h', () => {
    const decision = decide();
    assert.equal(decision.count, true);
    if (!decision.count) return;
    assert.equal(decision.cookieValue, `${POST_A}.${NOW + ARTICLE_VIEW_WINDOW_SEC}`);
    const again = decide({ cookie: decision.cookieValue });
    assert.deepEqual(again, { count: false, reason: 'repeat' });
  });

  it('counts again after the window and counts a different article', () => {
    const first = decide();
    assert.equal(first.count, true);
    if (!first.count) return;
    const later = decide({
      cookie: first.cookieValue,
      nowSec: NOW + ARTICLE_VIEW_WINDOW_SEC + 1,
    });
    assert.equal(later.count, true);

    const other = decide({ cookie: first.cookieValue, postId: POST_B });
    assert.equal(other.count, true);
    if (!other.count) return;
    assert.match(other.cookieValue, new RegExp(POST_A));
    assert.match(other.cookieValue, new RegExp(POST_B));
  });

  it('treats a missing cookie as a fresh browser', () => {
    const fresh = decide({ cookie: undefined });
    assert.equal(fresh.count, true);
  });

  it('skips prefetch, bots, cross-site posts, and editors/admins', () => {
    assert.deepEqual(decide({ prefetch: true }), { count: false, reason: 'prefetch' });
    assert.deepEqual(decide({ crossSite: true }), { count: false, reason: 'cross-site' });
    assert.deepEqual(
      decide({ userAgent: 'Mozilla/5.0 Chrome-Lighthouse' }),
      { count: false, reason: 'bot' }
    );
    assert.deepEqual(decide({ userAgent: 'curl/8.5.0' }), { count: false, reason: 'bot' });
    assert.deepEqual(decide({ userAgent: '' }), { count: false, reason: 'bot' });
    assert.deepEqual(decide({ role: 'ADMIN' }), { count: false, reason: 'staff' });
    assert.deepEqual(decide({ role: 'EDITOR' }), { count: false, reason: 'staff' });
    assert.equal(decide({ role: 'WRITER' }).count, true);
    assert.equal(decide({ role: 'USER' }).count, true);
  });

  it('rejects ids that are not post ids', () => {
    assert.deepEqual(decide({ postId: 'not-a-post' }), { count: false, reason: 'invalid' });
    assert.deepEqual(decide({ postId: '../etc/passwd' }), { count: false, reason: 'invalid' });
  });

  it('drops expired and malformed cookie entries and caps the list', () => {
    const parsed = parseViewCookie(
      `garbage~${POST_A}.${NOW - 10}~${POST_B}.${NOW + 50}`,
      NOW
    );
    assert.deepEqual(parsed, [{ id: POST_B, exp: NOW + 50 }]);

    const entries = Array.from({ length: ARTICLE_VIEW_MAX_ENTRIES + 5 }, (_, i) => {
      const id = `c${String(i).padStart(24, '0')}`;
      return `${id}.${NOW + 100 + i}`;
    }).join('~');
    const decision = decide({ cookie: entries, postId: POST_A });
    assert.equal(decision.count, true);
    if (!decision.count) return;
    assert.equal(decision.cookieValue.split('~').length, ARTICLE_VIEW_MAX_ENTRIES);
    assert.match(decision.cookieValue, new RegExp(`${POST_A}\\.`));
    assert.doesNotMatch(decision.cookieValue, /c000000000000000000000000\./);
  });

  it('recognizes Next prefetch and browser prefetch headers', () => {
    const headers = new Map<string, string>([
      ['next-router-prefetch', '1'],
    ]);
    assert.equal(isPrefetchRequest((name) => headers.get(name) ?? null), true);
    headers.set('next-router-prefetch', '2');
    assert.equal(isPrefetchRequest((name) => headers.get(name) ?? null), true);
    assert.equal(
      isPrefetchRequest((name) => (name === 'purpose' ? 'prefetch' : null)),
      true
    );
    assert.equal(
      isPrefetchRequest((name) => (name === 'sec-purpose' ? 'prefetch;prerender' : null)),
      true
    );
    assert.equal(isPrefetchRequest(() => null), false);
  });

  it('does not treat a normal Chrome or in-app browser UA as a bot', () => {
    const chrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    assert.equal(isObviousBot(chrome), false);
    const whatsApp =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/23.0';
    assert.equal(isObviousBot(whatsApp), false);
  });
});

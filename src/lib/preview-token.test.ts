import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PREVIEW_TOKEN_TTL_MS,
  assessPreviewAccess,
  createPreviewToken,
  hashPreviewToken,
  verifyPreviewTokenSignature,
} from './preview-token';

const SECRET = 'test-preview-secret';
const POST_A = 'cpreviewpost000000000001';
const POST_B = 'cpreviewpost000000000002';
const NOW = Date.parse('2026-11-17T12:00:00.000Z');

function recordFor(
  token: string,
  postId: string,
  overrides: Partial<{ expiresAt: number; revokedAt: number | null }> = {}
) {
  return {
    tokenHash: hashPreviewToken(token),
    postId,
    expiresAt: overrides.expiresAt ?? NOW + PREVIEW_TOKEN_TTL_MS,
    revokedAt: overrides.revokedAt ?? null,
  };
}

describe('preview token validation', () => {
  it('signs an unguessable token that expires in 7 days by default', () => {
    const issued = createPreviewToken(POST_A, SECRET, NOW);
    assert.equal(issued.expiresAt - NOW, PREVIEW_TOKEN_TTL_MS);
    assert.equal(issued.expiresAt - NOW, 7 * 24 * 60 * 60 * 1000);
    assert.ok(issued.token.includes('~'));
    assert.equal(issued.token.includes(POST_A), false);
    const verified = verifyPreviewTokenSignature(issued.token, SECRET, NOW);
    assert.equal(verified.ok, true);
    if (!verified.ok) return;
    assert.equal(verified.postId, POST_A);
    const access = assessPreviewAccess({
      token: issued.token,
      secret: SECRET,
      now: NOW,
      record: recordFor(issued.token, POST_A),
    });
    assert.deepEqual(access, { ok: true, postId: POST_A });
    assert.notEqual(hashPreviewToken(issued.token), issued.token);
  });

  it('rejects a tampered signature, a bad secret, and a malformed token', () => {
    const { token } = createPreviewToken(POST_A, SECRET, NOW);
    const [body] = token.split('~');
    assert.deepEqual(verifyPreviewTokenSignature(`${body}~aaaa`, SECRET, NOW), {
      ok: false,
      reason: 'bad-signature',
    });
    assert.equal(verifyPreviewTokenSignature(token, 'other-secret', NOW).ok, false);
    assert.deepEqual(verifyPreviewTokenSignature('not-a-token', SECRET, NOW), {
      ok: false,
      reason: 'malformed',
    });
    assert.deepEqual(assessPreviewAccess({ token: 'nope', secret: SECRET, now: NOW, record: null }), {
      ok: false,
      reason: 'malformed',
    });
  });

  it('rejects expired, revoked, unknown, and mismatched tokens', () => {
    const { token, expiresAt } = createPreviewToken(POST_A, SECRET, NOW);
    assert.deepEqual(verifyPreviewTokenSignature(token, SECRET, expiresAt), {
      ok: false,
      reason: 'expired',
    });
    assert.deepEqual(
      assessPreviewAccess({
        token,
        secret: SECRET,
        now: NOW,
        record: recordFor(token, POST_A, { revokedAt: NOW }),
      }),
      { ok: false, reason: 'revoked' }
    );
    assert.deepEqual(
      assessPreviewAccess({ token, secret: SECRET, now: NOW, record: null }),
      { ok: false, reason: 'unknown' }
    );
    assert.deepEqual(
      assessPreviewAccess({
        token,
        secret: SECRET,
        now: NOW,
        record: recordFor(token, POST_B),
      }),
      { ok: false, reason: 'mismatch' }
    );
    const other = createPreviewToken(POST_B, SECRET, NOW);
    assert.equal(
      assessPreviewAccess({
        token,
        secret: SECRET,
        now: NOW,
        record: recordFor(other.token, POST_A),
      }).ok,
      false
    );
  });

  it('does not accept a stored hash that belongs to a different draft', () => {
    const first = createPreviewToken(POST_A, SECRET, NOW);
    const second = createPreviewToken(POST_B, SECRET, NOW + 1);
    const access = assessPreviewAccess({
      token: first.token,
      secret: SECRET,
      now: NOW,
      record: {
        tokenHash: hashPreviewToken(second.token),
        postId: POST_B,
        expiresAt: second.expiresAt,
        revokedAt: null,
      },
    });
    assert.notEqual(access.ok && access.postId, POST_B);
    assert.equal(access.ok, false);
  });
});

describe('preview is not public discovery', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

  it('blocks the preview path in robots and response headers, and leaves sitemaps alone', () => {
    const robots = read('src/app/robots.ts');
    assert.match(robots, /\/preview\//);
    const config = read('next.config.ts');
    assert.match(config, /\/preview\/:path\*/);
    assert.match(config, /no-store/);
    assert.match(config, /noindex/);
    assert.equal(read('src/app/sitemap.ts').includes('/preview'), false);
    assert.equal(read('src/app/news-sitemap.xml/route.ts').includes('/preview'), false);
  });

  it('renders the preview with the article layout and without view counting', () => {
    const page = read('src/app/preview/[token]/page.tsx');
    const layout = read('src/app/preview/layout.tsx');
    assert.match(page, /ArticleDocument/);
    assert.match(page, /force-dynamic/);
    assert.match(page, /force-no-store/);
    assert.match(page, /index:\s*false/);
    assert.match(layout, /index:\s*false/);
    assert.equal(page.includes('ArticleViewBeacon'), false);
    assert.equal(page.includes('/api/views'), false);
    assert.equal(page.includes('post.views'), false);
  });
});

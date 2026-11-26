import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { signAlertToken, verifyAlertToken } from './alert-token';

const SECRET = 'test-alert-secret';
const NOW = Date.parse('2026-11-28T18:00:00.000Z');

describe('alert unsubscribe token', () => {
  it('round-trips the email and purpose', () => {
    const token = signAlertToken(' Reader@Example.com ', 'unsubscribe', SECRET, NOW);
    const verified = verifyAlertToken(token, SECRET, 'unsubscribe', NOW);
    assert.deepEqual(verified, { ok: true, email: 'reader@example.com' });
  });

  it('rejects a tampered signature', () => {
    const token = signAlertToken('reader@example.com', 'unsubscribe', SECRET, NOW);
    const [body, sig] = token.split('~');
    const flipped = `${body}~${sig.slice(0, -1)}${sig.endsWith('a') ? 'b' : 'a'}`;
    const verified = verifyAlertToken(flipped, SECRET, 'unsubscribe', NOW);
    assert.equal(verified.ok, false);
    if (!verified.ok) assert.equal(verified.reason, 'bad-signature');
  });

  it('rejects a token signed with a different secret', () => {
    const token = signAlertToken('reader@example.com', 'unsubscribe', SECRET, NOW);
    const verified = verifyAlertToken(token, 'other-secret', 'unsubscribe', NOW);
    assert.equal(verified.ok, false);
    if (!verified.ok) assert.equal(verified.reason, 'bad-signature');
  });

  it('rejects an expired token', () => {
    const token = signAlertToken('reader@example.com', 'confirm', SECRET, NOW);
    const later = NOW + 49 * 60 * 60 * 1000;
    const verified = verifyAlertToken(token, SECRET, 'confirm', later);
    assert.equal(verified.ok, false);
    if (!verified.ok) assert.equal(verified.reason, 'expired');
  });

  it('rejects a confirm token used as an unsubscribe link', () => {
    const token = signAlertToken('reader@example.com', 'confirm', SECRET, NOW);
    const verified = verifyAlertToken(token, SECRET, 'unsubscribe', NOW);
    assert.equal(verified.ok, false);
    if (!verified.ok) assert.equal(verified.reason, 'purpose');
  });

  it('rejects a malformed token', () => {
    const verified = verifyAlertToken('not-a-token', SECRET, 'unsubscribe', NOW);
    assert.equal(verified.ok, false);
    if (!verified.ok) assert.equal(verified.reason, 'malformed');
  });
});

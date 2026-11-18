import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampAtWord } from './article-metadata';

test('short titles are unchanged', () => {
  assert.equal(clampAtWord('BYU beats Baylor 28-7', 70), 'BYU beats Baylor 28-7');
});

test('long titles cut at a word, never mid-word', () => {
  const t = 'Leaked audio shows Utah leftists discussing political violence at a campus meeting in Provo';
  const out = clampAtWord(t, 70);
  assert.ok(out.length <= 70);
  assert.ok(t.startsWith(out));
  assert.equal(t[out.length], ' ');
});

test('trailing punctuation is trimmed', () => {
  assert.equal(clampAtWord('Alpha beta gamma, delta epsilon', 17), 'Alpha beta gamma');
});

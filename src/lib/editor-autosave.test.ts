import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draftsEqual, shouldOfferRestore, type EditorDraft } from './editor-draft';
import {
  AUTOSAVE_DEBOUNCE_MS,
  AUTOSAVE_MAX_WAIT_MS,
  autosaveDue,
  formatSavedLabel,
  idleClock,
  noteEdit,
} from './editor-autosave';

function draft(title: string): EditorDraft {
  return {
    title,
    slug: 'story',
    category: 'campus',
    format: 'news',
    content: '<p>Hello</p>',
    imageUrl: '',
    authorId: 'author',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    keyInsights: '',
    featuredImageAlt: '',
    customAuthor: '',
    isPremium: false,
    showDonateCta: true,
    isAmerica250: false,
    isBreaking: false,
    breakingHours: 24,
    printEditionId: '',
    printEditionOrder: '',
    imageCaption: '',
    editorChecklist: {},
    publishedAt: '',
  };
}

describe('autosave timing', () => {
  it('waits 3 seconds after typing stops', () => {
    let clock = idleClock();
    let now = 0;
    for (let i = 0; i < 6; i += 1) {
      now += 400;
      clock = noteEdit(clock, now);
      assert.equal(autosaveDue(clock, now), false);
    }
    assert.equal(autosaveDue(clock, now + AUTOSAVE_DEBOUNCE_MS - 1), false);
    assert.equal(autosaveDue(clock, now + AUTOSAVE_DEBOUNCE_MS), true);
  });

  it('saves at least every 30 seconds while typing continues', () => {
    let clock = idleClock();
    let now = 1_000;
    clock = noteEdit(clock, now);
    for (let i = 0; i < 40; i += 1) {
      now += 1_000;
      clock = noteEdit(clock, now);
    }
    assert.equal(now - 1_000, 40_000);
    assert.equal(autosaveDue(clock, 1_000 + AUTOSAVE_MAX_WAIT_MS - 1), false);
    assert.equal(autosaveDue(clock, 1_000 + AUTOSAVE_MAX_WAIT_MS), true);
  });

  it('does not schedule work for a burst of identical keystroke clocks beyond the timer', () => {
    const started = Date.now();
    let clock = idleClock();
    let now = 0;
    let saves = 0;
    for (let i = 0; i < 200; i += 1) {
      now += 50;
      clock = noteEdit(clock, now);
      if (autosaveDue(clock, now)) {
        saves += 1;
        clock = idleClock();
      }
    }
    assert.equal(saves, 0);
    assert.ok(Date.now() - started < 100);
  });

  it('formats a quiet saved time', () => {
    const label = formatSavedLabel('Saved', new Date(2026, 10, 17, 12, 3));
    assert.equal(label, 'Saved · 12:03');
    assert.equal(formatSavedLabel('Saved locally', new Date(2026, 10, 17, 0, 5)), 'Saved locally · 12:05');
  });
});

describe('crash recovery', () => {
  it('offers a newer local copy and skips a copy the server already has', () => {
    const server = draft('From server');
    const local = draft('From this browser');
    assert.equal(
      shouldOfferRestore(
        { savedAt: 2_000, serverUpdatedAt: '2026-11-17T00:00:00.000Z', draft: local },
        '2026-11-17T00:00:00.000Z',
        server
      ),
      true
    );
    assert.equal(
      shouldOfferRestore(
        { savedAt: 2_000, serverUpdatedAt: '2026-11-17T00:00:00.000Z', draft: server },
        '2026-11-17T00:00:00.000Z',
        server
      ),
      false
    );
    assert.equal(
      shouldOfferRestore(
        { savedAt: 1_000, serverUpdatedAt: '2026-11-17T00:00:00.000Z', draft: local },
        '2026-11-18T00:00:00.000Z',
        server
      ),
      false
    );
    assert.equal(draftsEqual(server, { ...server }), true);
  });
});

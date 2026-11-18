import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AUTOSAVE_REVISION_GAP_MS,
  MAX_REVISIONS_PER_POST,
  autosaveWritesLivePost,
  planAutosave,
  revisionIdsToPrune,
  shouldKeepAutosaveRevision,
} from './revisions';

describe('revision pruning', () => {
  it('keeps the newest 50 and returns the older ids', () => {
    const revisions = Array.from({ length: 55 }, (_, index) => ({
      id: `rev-${index}`,
      createdAt: index,
    }));
    const drop = revisionIdsToPrune(revisions);
    assert.equal(MAX_REVISIONS_PER_POST, 50);
    assert.equal(drop.length, 5);
    assert.deepEqual(drop.sort(), ['rev-0', 'rev-1', 'rev-2', 'rev-3', 'rev-4']);
  });

  it('keeps every revision when there are 50 or fewer', () => {
    const revisions = Array.from({ length: 50 }, (_, index) => ({
      id: `rev-${index}`,
      createdAt: 1_000 - index,
    }));
    assert.deepEqual(revisionIdsToPrune(revisions), []);
    assert.deepEqual(revisionIdsToPrune([]), []);
  });

  it('breaks timestamp ties by id so pruning is stable', () => {
    const revisions = [
      { id: 'b', createdAt: 10 },
      { id: 'a', createdAt: 10 },
      { id: 'c', createdAt: 10 },
    ];
    assert.deepEqual(revisionIdsToPrune(revisions, 1), ['b', 'c']);
  });

  it('records an autosave revision at most every 10 minutes', () => {
    const now = 1_700_000_000_000;
    assert.equal(shouldKeepAutosaveRevision(null, now), true);
    assert.equal(shouldKeepAutosaveRevision(now - AUTOSAVE_REVISION_GAP_MS + 1, now), false);
    assert.equal(shouldKeepAutosaveRevision(now - AUTOSAVE_REVISION_GAP_MS, now), true);
    assert.equal(AUTOSAVE_REVISION_GAP_MS, 10 * 60 * 1000);
  });

  it('never lets autosave write a published story', () => {
    assert.equal(autosaveWritesLivePost('PUBLISHED'), false);
    assert.equal(autosaveWritesLivePost('DRAFT'), true);
    assert.equal(autosaveWritesLivePost('IN_REVIEW'), true);
    assert.equal(autosaveWritesLivePost('APPROVED'), true);
    assert.equal(autosaveWritesLivePost(null), false);
    assert.equal(planAutosave({ autosave: true, hasId: true, state: 'PUBLISHED' }), 'revision-only');
    assert.equal(planAutosave({ autosave: true, hasId: true, state: 'DRAFT' }), 'live-post');
    assert.equal(planAutosave({ autosave: true, hasId: false, state: 'DRAFT' }), 'local-only');
    assert.equal(planAutosave({ autosave: false, hasId: true, state: 'PUBLISHED' }), 'manual');
  });
});

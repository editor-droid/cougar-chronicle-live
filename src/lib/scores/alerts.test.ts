import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  alertsForRecipient,
  FINAL_WINDOW_MS,
  GAME_DAY_LEAD_MS,
  selectDueAlerts,
} from './alerts';
import type { SportKey } from './types';

const NOW = Date.parse('2026-11-28T18:00:00.000Z');

function item(
  sport: SportKey,
  id: string,
  startMs: number,
  state: 'pre' | 'in' | 'post',
) {
  return { sport, game: { id, start: new Date(startMs).toISOString(), state } };
}

describe('game-day alert selection', () => {
  it('picks a pregame inside the lead window and a recent final', () => {
    const due = selectDueAlerts([
      item('football', 'soon', NOW + 2 * 60 * 60 * 1000, 'pre'),
      item('football', 'later', NOW + GAME_DAY_LEAD_MS + 60_000, 'pre'),
      item('football', 'edge', NOW + GAME_DAY_LEAD_MS, 'pre'),
      item('mens-basketball', 'live', NOW - 30 * 60 * 1000, 'in'),
      item('womens-basketball', 'final', NOW - 3 * 60 * 60 * 1000, 'post'),
      item('womens-soccer', 'old', NOW - FINAL_WINDOW_MS - 60_000, 'post'),
      { sport: 'football', game: { id: 'bad', start: 'not-a-date', state: 'pre' as const } },
    ], NOW);

    assert.deepEqual(
      due.map((alert) => `${alert.eventId}:${alert.kind}`),
      ['soon:gameday', 'edge:gameday', 'final:final'],
    );
  });

  it('does not send a pregame alert after the listed start', () => {
    const due = selectDueAlerts([
      item('football', 'started', NOW - 60_000, 'pre'),
      item('football', 'now', NOW, 'pre'),
    ], NOW);
    assert.equal(due.length, 0);
  });

  it('keeps a final that ended at the edge of the window', () => {
    const due = selectDueAlerts([
      item('football', 'edge', NOW - FINAL_WINDOW_MS, 'post'),
    ], NOW);
    assert.equal(due.length, 1);
    assert.equal(due[0]?.kind, 'final');
  });
});

describe('game-day alert dedupe', () => {
  const due = selectDueAlerts([
    item('football', 'fb', NOW + 60 * 60 * 1000, 'pre'),
    item('womens-soccer', 'soc', NOW - 2 * 60 * 60 * 1000, 'post'),
  ], NOW);

  it('skips sports the person did not opt into and alerts already sent', () => {
    const pending = alertsForRecipient(
      due,
      ['football'],
      'reader-a',
      [{ eventId: 'fb', kind: 'gameday', recipientId: 'reader-a' }],
    );
    assert.equal(pending.length, 0);
  });

  it('still sends when the marker belongs to someone else', () => {
    const pending = alertsForRecipient(
      due,
      ['football', 'womens-soccer'],
      'reader-b',
      [{ eventId: 'fb', kind: 'gameday', recipientId: 'reader-a' }],
    );
    assert.deepEqual(pending.map((alert) => alert.eventId), ['fb', 'soc']);
  });

  it('sends a final after the pregame alert for the same event', () => {
    const both = selectDueAlerts([
      item('football', 'fb', NOW - 3 * 60 * 60 * 1000, 'post'),
    ], NOW);
    const pending = alertsForRecipient(
      both,
      ['football'],
      'reader-a',
      [{ eventId: 'fb', kind: 'gameday', recipientId: 'reader-a' }],
    );
    assert.deepEqual(pending.map((alert) => alert.kind), ['final']);
  });

  it('sends nothing when no sport is selected', () => {
    assert.equal(alertsForRecipient(due, [], 'reader-a', []).length, 0);
  });
});

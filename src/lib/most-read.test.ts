import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MOST_READ_FALLBACK_MS,
  MOST_READ_MIN_POSTS,
  MOST_READ_MIN_VIEWS,
  MOST_READ_WINDOW_MS,
  dateKeysCovering,
  selectMostRead,
  utcDateKey,
  utcDay,
  type RankableView,
} from './most-read';

const NOW = new Date('2026-11-17T15:00:00.000Z');

function row(
  postId: string,
  date: string,
  count: number,
  extra: Partial<RankableView> = {}
): RankableView {
  return {
    postId,
    date,
    count,
    isPremium: false,
    printEditionId: null,
    publishedAt: '2026-11-01T12:00:00.000Z',
    ...extra,
  };
}

function daysFrom(now: Date, deltaDays: number): string {
  return utcDateKey(new Date(now.getTime() + deltaDays * 24 * 60 * 60 * 1000));
}

describe('utc day buckets', () => {
  it('stores the UTC calendar date, including just after midnight', () => {
    assert.equal(utcDateKey(new Date('2026-11-17T00:30:00.000Z')), '2026-11-17');
    assert.equal(utcDateKey(new Date('2026-11-17T23:30:00.000Z')), '2026-11-17');
    assert.equal(utcDay(new Date('2026-11-17T23:30:00.000Z')).toISOString(), '2026-11-17T00:00:00.000Z');
  });

  it('covers every UTC date a rolling window touches', () => {
    const day = dateKeysCovering(NOW, MOST_READ_WINDOW_MS);
    assert.deepEqual([...day].sort(), ['2026-11-16', '2026-11-17']);

    const atMidnight = dateKeysCovering(new Date('2026-11-17T00:00:00.000Z'), MOST_READ_WINDOW_MS);
    assert.ok(atMidnight.has('2026-11-16'));
    assert.ok(atMidnight.has('2026-11-17'));

    const week = dateKeysCovering(NOW, MOST_READ_FALLBACK_MS);
    assert.equal(week.size, 8);
    assert.ok(week.has('2026-11-10'));
    assert.ok(week.has('2026-11-17'));
    assert.equal(week.has('2026-11-09'), false);
  });
});

describe('selectMostRead', () => {
  it('sums the UTC dates inside the rolling 24h window and ranks them', () => {
    const today = daysFrom(NOW, 0);
    const yesterday = daysFrom(NOW, -1);
    const older = daysFrom(NOW, -3);
    const rows = [
      row('c-low', today, 2),
      row('c-low', yesterday, 2),
      row('c-mid', today, 4),
      row('c-high', yesterday, 9),
      row('c-old', older, 500),
    ];
    const selected = selectMostRead(rows, { now: NOW, take: 5 });
    assert.equal(selected.window, '24h');
    assert.deepEqual(selected.ranking, [
      { postId: 'c-high', views: 9 },
      { postId: 'c-low', views: 4 },
      { postId: 'c-mid', views: 4 },
    ]);
    assert.equal(selected.ranking.some((item) => item.postId === 'c-old'), false);
  });

  it('breaks view ties by post id', () => {
    const today = daysFrom(NOW, 0);
    const selected = selectMostRead(
      [row('c-b', today, 5), row('c-a', today, 5), row('c-c', today, 5)],
      { now: NOW, take: 3 }
    );
    assert.equal(selected.window, '24h');
    assert.deepEqual(
      selected.ranking.map((item) => item.postId),
      ['c-a', 'c-b', 'c-c']
    );
  });

  it('falls back to 7 days when the 24h window is below the minimum', () => {
    const today = daysFrom(NOW, 0);
    const week = daysFrom(NOW, -4);
    const outside = daysFrom(NOW, -8);
    const rows = [
      row('c-today-a', today, 4),
      row('c-today-b', today, 4),
      row('c-week-a', week, 3),
      row('c-week-b', week, 3),
      row('c-week-c', week, 3),
      row('c-ancient', outside, 100),
    ];
    const selected = selectMostRead(rows, { now: NOW, take: 10 });
    assert.equal(selected.window, '7d');
    assert.ok(selected.ranking.some((item) => item.postId === 'c-today-a'));
    assert.ok(selected.ranking.some((item) => item.postId === 'c-week-a'));
    assert.equal(selected.ranking.some((item) => item.postId === 'c-ancient'), false);
    assert.ok(selected.ranking.length >= MOST_READ_MIN_POSTS);
    const total = selected.ranking.reduce((sum, item) => sum + item.views, 0);
    assert.ok(total >= MOST_READ_MIN_VIEWS);
  });

  it('uses all-time when the 7-day window is still too thin', () => {
    const today = daysFrom(NOW, 0);
    const selected = selectMostRead([row('c-only', today, MOST_READ_MIN_VIEWS)], {
      now: NOW,
      take: 5,
    });
    assert.deepEqual(selected, { window: 'all-time', ranking: [] });
  });

  it('ignores non-positive counts', () => {
    const today = daysFrom(NOW, 0);
    const selected = selectMostRead(
      [
        row('c-a', today, 0),
        row('c-b', today, -3),
        row('c-c', today, 10),
        row('c-d', today, 10),
        row('c-e', today, 10),
      ],
      { now: NOW, take: 5 }
    );
    assert.equal(selected.window, '24h');
    assert.deepEqual(
      selected.ranking.map((item) => item.postId),
      ['c-c', 'c-d', 'c-e']
    );
  });

  it('applies print, premium, and publish filters before the threshold, then hides ids', () => {
    const today = daysFrom(NOW, 0);
    const rows = [
      row('c-print', today, 20, { printEditionId: 'edition' }),
      row('c-premium', today, 20, { isPremium: true }),
      row('c-self', today, 20),
      row('c-future', today, 20, { publishedAt: '2026-11-18T00:00:00.000Z' }),
      row('c-unscheduled', today, 20, { publishedAt: null }),
      row('c-keep', today, 3),
    ];
    const selected = selectMostRead(rows, {
      now: NOW,
      take: 5,
      excludePrint: true,
      excludePremium: true,
      excludeIds: ['c-self'],
      publishedByNow: true,
    });
    assert.equal(selected.window, 'all-time');

    const kept = selectMostRead(
      [
        ...rows,
        row('c-also', today, 3),
        row('c-third', today, 3),
      ],
      {
        now: NOW,
        take: 5,
        excludePrint: true,
        excludePremium: true,
        excludeIds: ['c-self'],
        publishedByNow: true,
      }
    );
    assert.equal(kept.window, '24h');
    assert.deepEqual(
      kept.ranking.map((item) => item.postId).sort(),
      ['c-also', 'c-keep', 'c-third']
    );
  });

  it('keeps print and premium rows when the surface does not exclude them', () => {
    const today = daysFrom(NOW, 0);
    const selected = selectMostRead(
      [
        row('c-print', today, 5, { printEditionId: 'edition' }),
        row('c-premium', today, 4, { isPremium: true }),
        row('c-free', today, 3),
      ],
      { now: NOW, take: 5 }
    );
    assert.equal(selected.window, '24h');
    assert.deepEqual(
      selected.ranking.map((item) => item.postId),
      ['c-print', 'c-premium', 'c-free']
    );
  });

  it('keeps the 24h window after hiding the story on screen', () => {
    const today = daysFrom(NOW, 0);
    const selected = selectMostRead(
      [row('c-current', today, 10), row('c-next', today, 4), row('c-third', today, 3)],
      { now: NOW, take: 5, excludeIds: ['c-current'] }
    );
    assert.equal(selected.window, '24h');
    assert.deepEqual(
      selected.ranking.map((item) => item.postId),
      ['c-next', 'c-third']
    );
  });

  it('respects take after ranking', () => {
    const today = daysFrom(NOW, 0);
    const selected = selectMostRead(
      [row('c-1', today, 5), row('c-2', today, 4), row('c-3', today, 3), row('c-4', today, 2)],
      { now: NOW, take: 2 }
    );
    assert.equal(selected.window, '24h');
    assert.deepEqual(
      selected.ranking.map((item) => item.postId),
      ['c-1', 'c-2']
    );
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { coverageForGames, editorGameOptions, pickLiveGame } from './coverage';
import { buildRecapHtml, ensureRecap, shouldCreateRecap } from './recap';
import { findGameForStory } from './stories';
import type { ScoreGame, SportKey } from './types';

function game(partial: Partial<ScoreGame> & Pick<ScoreGame, 'id' | 'opponent' | 'start' | 'state'>): ScoreGame {
  return {
    statusText: partial.state === 'post' ? 'Final' : 'Scheduled',
    clock: null,
    period: null,
    homeAway: 'away',
    neutral: false,
    opponentAbbrev: 'OPP',
    opponentRank: null,
    byuScore: partial.state === 'post' ? '20' : null,
    opponentScore: partial.state === 'post' ? '28' : null,
    byuWinner: partial.state === 'post' ? false : null,
    byuRank: null,
    tv: 'Fox',
    venue: 'Rice-Eccles Stadium',
    statBroadcastUrl: null,
    ...partial,
  };
}

function listed(sport: SportKey, item: ScoreGame) {
  return { sport, game: item };
}

const NOW = Date.parse('2026-11-08T18:00:00Z');

describe('recap starter', () => {
  const utah = game({
    id: '401',
    opponent: 'Utah',
    start: '2026-11-07T17:00:00Z',
    state: 'post',
  });

  it('only starts a recap for a final from the last three days', () => {
    assert.equal(shouldCreateRecap(utah, NOW), true);
    assert.equal(shouldCreateRecap(game({
      id: 'old',
      opponent: 'Kansas',
      start: '2026-09-01T00:00:00Z',
      state: 'post',
    }), NOW), false);
    assert.equal(shouldCreateRecap(game({
      id: 'next',
      opponent: 'Cincinnati',
      start: '2026-11-28T20:00:00Z',
      state: 'pre',
    }), NOW), false);
  });

  it('fills the score and performers and marks the copy as an unpublished draft', () => {
    const html = buildRecapHtml(utah, {
      game: utah,
      byuRecord: '7-2',
      opponentRecord: '9-0',
      attendance: null,
      line: null,
      overUnder: null,
      linescores: [],
      teamStats: [{ label: 'Total Yards', byu: '391', opponent: '330' }],
      box: [],
      performers: [{ side: 'byu', category: 'Passing', name: 'Bear Bachmeier', line: '272 YDS' }],
    });
    assert.match(html, /Draft for a writer/);
    assert.match(html, /Do not publish this starter as-is/);
    assert.match(html, /Final: BYU 20, Utah 28/);
    assert.match(html, /Bear Bachmeier/);
    assert.match(html, /Total Yards/);
    assert.equal(html.includes('PUBLISHED'), false);
  });

  it('creates one draft and treats a unique collision as already created', async () => {
    const ids = new Set<string>();
    const deps = {
      findExisting: async (id: string) => ids.has(id),
      insert: async (id: string) => {
        if (ids.has(id)) {
          const error = new Error('unique');
          (error as { code?: string }).code = 'P2002';
          throw error;
        }
        ids.add(id);
      },
    };
    assert.equal(await ensureRecap('401', deps), 'created');
    assert.equal(await ensureRecap('401', deps), 'exists');

    let stored = false;
    const raced = {
      findExisting: async () => false,
      insert: async () => {
        if (stored) {
          const error = new Error('unique');
          (error as { code?: string }).code = 'P2002';
          throw error;
        }
        stored = true;
      },
    };
    assert.equal(await ensureRecap('401', raced), 'created');
    assert.equal(await ensureRecap('401', raced), 'exists');
  });
});

describe('editor game choice and coverage', () => {
  const utah = game({ id: 'fb', opponent: 'Utah', start: '2026-11-07T17:00:00Z', state: 'post' });
  const kansas = game({ id: 'ku', opponent: 'Kansas', start: '2026-11-21T17:00:00Z', state: 'pre' });

  it('uses the editor selection even when the title names another opponent', () => {
    const games = [listed('football', utah), listed('football', kansas)];
    const match = findGameForStory({
      id: 'story',
      title: 'Cougars fall to Utah',
      publishedAt: '2026-11-08T05:00:00Z',
      espnEventId: 'ku',
    }, games);
    assert.equal(match?.game.id, 'ku');
  });

  it('lists recent and upcoming games and flags a final with no recap', () => {
    const games = [listed('football', utah), listed('football', kansas)];
    const options = editorGameOptions(games, NOW);
    assert.deepEqual(options.map((option) => option.id), ['ku', 'fb']);
    const gaps = coverageForGames(games, [], NOW);
    const finalGap = gaps.find((row) => row.game.id === 'fb');
    const nextGap = gaps.find((row) => row.game.id === 'ku');
    assert.equal(finalGap?.missingRecap, true);
    assert.equal(finalGap?.missingPreview, true);
    assert.equal(nextGap?.missingPreview, true);
    assert.equal(nextGap?.missingRecap, false);
  });

  it('counts a published linked story and keeps the homepage bar empty without a live game', () => {
    const gaps = coverageForGames([listed('football', utah)], [{
      id: 'recap',
      title: 'Utah recap',
      publishedAt: '2026-11-08T05:00:00Z',
      espnEventId: 'fb',
      state: 'PUBLISHED',
    }], NOW);
    assert.equal(gaps[0]?.missingRecap, false);
    assert.equal(pickLiveGame([listed('football', utah), listed('football', kansas)]), null);
    const live = game({ id: 'live', opponent: 'Cincinnati', start: '2026-11-08T17:00:00Z', state: 'in', byuScore: '7', opponentScore: '3' });
    assert.equal(pickLiveGame([listed('football', live)])?.game.id, 'live');
  });
});

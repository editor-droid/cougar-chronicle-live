import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findGameForStory, mentionsOpponent, storiesForGame, storyFitsSport, type StoryRef } from './stories';
import type { ScoreGame, SportKey } from './types';

function game(partial: Partial<ScoreGame> & Pick<ScoreGame, 'id' | 'opponent' | 'start'>): ScoreGame {
  return {
    state: 'post',
    statusText: 'Final',
    clock: null,
    period: null,
    homeAway: 'away',
    neutral: false,
    opponentAbbrev: 'OPP',
    opponentRank: null,
    byuScore: '20',
    opponentScore: '28',
    byuWinner: false,
    byuRank: null,
    tv: null,
    venue: null,
    statBroadcastUrl: null,
    ...partial,
  };
}

const utahFootball = game({ id: 'fb', opponent: 'Utah', start: '2026-11-07T17:00:00Z' });
const utahHoops = game({
  id: 'mbb',
  opponent: 'Utah',
  start: '2026-12-12T20:00:00Z',
  state: 'pre',
  byuScore: null,
  opponentScore: null,
  byuWinner: null,
});

function listed(sport: SportKey, item: ScoreGame) {
  return { sport, game: item };
}

describe('story matching', () => {
  it('does not treat Utah State or Utah Tech as Utah', () => {
    assert.equal(mentionsOpponent('BYU football notes on Utah State', 'Utah'), false);
    assert.equal(mentionsOpponent('Preview: Utah Tech at BYU', 'Utah'), false);
    assert.equal(mentionsOpponent("Cougars fall to Utah in Salt Lake", 'Utah'), true);
  });

  it('links a story to the opponent game closest to its publish date', () => {
    const story: StoryRef = {
      id: 'a',
      title: 'Cougars fall to Utah in Salt Lake',
      publishedAt: '2026-11-08T05:00:00Z',
    };
    const match = findGameForStory(story, [
      listed('football', utahFootball),
      listed('mens-basketball', utahHoops),
    ]);
    assert.equal(match?.game.id, 'fb');
    assert.deepEqual(storiesForGame(utahFootball, [story]).map((item) => item.id), ['a']);
    assert.deepEqual(storiesForGame(utahHoops, [story]), []);
  });

  it('lets a sport word break a tie between two games on the same weekend', () => {
    const story: StoryRef = {
      id: 'b',
      title: "Men's basketball: BYU handles Utah",
      publishedAt: '2026-11-08T05:00:00Z',
    };
    const sameWeekend = game({ id: 'mbb-near', opponent: 'Utah', start: '2026-11-07T20:00:00Z' });
    const match = findGameForStory(story, [
      listed('football', utahFootball),
      listed('mens-basketball', sameWeekend),
    ]);
    assert.equal(match?.sport, 'mens-basketball');
    assert.equal(match?.game.id, 'mbb-near');
  });

  it('keeps a football story off the basketball story list', () => {
    assert.equal(storyFitsSport('BYU football recap at Utah', 'football', ['Utah', 'Kansas']), true);
    assert.equal(storyFitsSport('BYU football recap at Utah', 'mens-basketball', ['Utah']), false);
    assert.equal(storyFitsSport('Kansas leaves Provo with a win', 'football', ['Kansas']), true);
    assert.equal(storyFitsSport('Campus notes from the library', 'football', ['Utah']), false);
  });
});

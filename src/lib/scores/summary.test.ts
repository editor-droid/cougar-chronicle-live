import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recordFromGames } from './assemble';
import { formatSeoDate } from './format';
import { athleteIdFromRef, parseSeasonLeaders, parseTeamAverages } from './season';
import { gameSeoTitle } from './seo';
import { parseConferenceStandings } from './standings';
import { parseGameSummary } from './summary';
import type { ScoreGame } from './types';

function game(partial: Partial<ScoreGame> & Pick<ScoreGame, 'id' | 'opponent' | 'start'>): ScoreGame {
  return {
    state: 'post',
    statusText: 'Final',
    clock: null,
    period: null,
    homeAway: 'home',
    neutral: false,
    opponentAbbrev: 'OPP',
    opponentRank: null,
    byuScore: '1',
    opponentScore: '0',
    byuWinner: true,
    byuRank: null,
    tv: null,
    venue: null,
    statBroadcastUrl: null,
    ...partial,
  };
}

describe('game summary parser', () => {
  it('reads a final football box score, lines, leaders, and records', () => {
    const summary = parseGameSummary({
      header: {
        id: '401856849',
        competitions: [{
          competitors: [
            {
              id: '254',
              homeAway: 'home',
              score: '28',
              winner: true,
              linescores: [{ displayValue: '7' }, { displayValue: '7' }, { displayValue: '7' }, { displayValue: '7' }],
              record: [{ type: 'total', summary: '9-0' }],
              team: { id: '254', abbreviation: 'UTAH', shortDisplayName: 'Utah' },
            },
            {
              id: '252',
              homeAway: 'away',
              score: '20',
              winner: false,
              linescores: [{ displayValue: '0' }, { displayValue: '10' }, { displayValue: '3' }, { displayValue: '7' }],
              record: [{ type: 'total', summary: '7-2' }],
              team: { id: '252', abbreviation: 'BYU', shortDisplayName: 'BYU' },
            },
          ],
          status: { type: { state: 'post', completed: true, shortDetail: 'Final' } },
          venue: { fullName: 'Rice-Eccles Stadium' },
        }],
      },
      gameInfo: { attendance: 52901 },
      pickcenter: [{ details: 'UTAH -4', overUnder: 49.5, provider: { name: 'DraftKings' } }],
      boxscore: {
        teams: [
          {
            team: { id: '252' },
            statistics: [
              { name: 'totalYards', label: 'Total Yards', displayValue: '391' },
              { name: 'firstDowns', label: '1st Downs', displayValue: '15' },
            ],
          },
          {
            team: { id: '254' },
            statistics: [
              { name: 'totalYards', label: 'Total Yards', displayValue: '330' },
              { name: 'firstDowns', label: '1st Downs', displayValue: '16' },
              { name: 'ignored', label: '', displayValue: '' },
            ],
          },
        ],
        players: [
          {
            team: { id: '252', shortDisplayName: 'BYU' },
            statistics: [{
              name: 'passing',
              labels: ['C/ATT', 'YDS', 'TD'],
              athletes: [
                { athlete: { displayName: 'Bear Bachmeier' }, stats: ['21/35', '272', '1'] },
                { didNotPlay: true, athlete: { displayName: 'Absent' }, stats: [''] },
              ],
              totals: ['21/36', '272', '1'],
            }],
          },
        ],
      },
      leaders: [
        {
          team: { id: '252' },
          leaders: [{
            displayName: 'Passing',
            leaders: [{ displayValue: '21/35, 272 YDS, 1 TD', athlete: { displayName: 'Bear Bachmeier' } }],
          }],
        },
        {
          team: { id: '254' },
          leaders: [{
            name: 'passingYards',
            leaders: [{ displayValue: '', athlete: { displayName: 'Devon Dampier' } }],
          }],
        },
      ],
    }, { teamId: '252', eventDate: '2026-11-07T17:00:00Z', sport: 'football' });

    assert.ok(summary);
    assert.equal(summary.game.byuScore, '20');
    assert.equal(summary.game.opponent, 'Utah');
    assert.equal(summary.game.start, '2026-11-07T17:00:00.000Z');
    assert.equal(summary.byuRecord, '7-2');
    assert.equal(summary.opponentRecord, '9-0');
    assert.equal(summary.attendance, 52901);
    assert.equal(summary.line, 'UTAH -4');
    assert.equal(summary.overUnder, 49.5);
    assert.deepEqual(summary.linescores.map((row) => row.label), ['Q1', 'Q2', 'Q3', 'Q4']);
    assert.equal(summary.linescores[1].byu, '10');
    assert.deepEqual(summary.teamStats.map((row) => row.label), ['1st Downs', 'Total Yards']);
    assert.equal(summary.box.length, 1);
    assert.equal(summary.box[0].groups[0].rows[0].name, 'Bear Bachmeier');
    assert.equal(summary.box[0].groups[0].rows[1].name, 'Total');
    assert.deepEqual(summary.performers, [{
      side: 'byu',
      category: 'Passing',
      name: 'Bear Bachmeier',
      line: '21/35, 272 YDS, 1 TD',
    }]);
    assert.equal(gameSeoTitle(summary.game), 'BYU at Utah Score & Box Score, Nov 7, 2026');
    assert.equal(formatSeoDate(summary.game.start), 'Nov 7, 2026');
  });

  it('keeps a thin soccer summary and hides sections ESPN left out', () => {
    const summary = parseGameSummary({
      header: {
        id: '401884137',
        competitions: [{
          competitors: [
            {
              id: '20516',
              homeAway: 'away',
              score: '2',
              winner: true,
              linescores: [{ displayValue: '1' }, { displayValue: '1' }],
              team: { id: '20516', abbreviation: 'BYU', shortDisplayName: 'BYU' },
            },
            {
              id: '26',
              homeAway: 'home',
              score: '1',
              winner: false,
              linescores: [{ displayValue: '1' }, { displayValue: '0' }],
              team: { id: '26', abbreviation: 'UCLA', shortDisplayName: 'UCLA' },
            },
          ],
          status: { type: { state: 'post', completed: true, shortDetail: 'FT' } },
        }],
      },
    }, { teamId: '20516', eventDate: '2026-11-01T02:00:00Z', sport: 'womens-soccer' });

    assert.ok(summary);
    assert.equal(summary.game.byuScore, '2');
    assert.equal(summary.game.opponent, 'UCLA');
    assert.deepEqual(summary.linescores.map((row) => `${row.label}:${row.byu}`), ['1st:1', '2nd:1']);
    assert.deepEqual(summary.teamStats, []);
    assert.deepEqual(summary.box, []);
    assert.deepEqual(summary.performers, []);
    assert.equal(summary.byuRecord, null);
    assert.equal(summary.attendance, null);
    assert.equal(summary.line, null);
    assert.equal(summary.overUnder, null);
  });

  it('reads the line and over/under from pickcenter and ignores the provider', () => {
    const summary = parseGameSummary({
      header: {
        id: '401856876',
        competitions: [{
          competitors: [
            {
              id: '252',
              homeAway: 'home',
              team: { id: '252', abbreviation: 'BYU', shortDisplayName: 'BYU' },
            },
            {
              id: '2132',
              homeAway: 'away',
              team: { id: '2132', abbreviation: 'CIN', shortDisplayName: 'Cincinnati' },
            },
          ],
          status: { type: { state: 'pre', completed: false, shortDetail: 'Sat 3:30 PM' } },
        }],
      },
      pickcenter: [{ details: 'BYU -15.5', overUnder: '56.5', provider: { name: 'DraftKings' } }],
    }, { teamId: '252', eventDate: '2026-11-28T20:30:00Z', sport: 'football' });

    assert.ok(summary);
    assert.equal(summary.line, 'BYU -15.5');
    assert.equal(summary.overUnder, 56.5);
  });

  it('returns null when the summary has no usable header', () => {
    assert.equal(parseGameSummary({ boxscore: {} }, {
      teamId: '252',
      eventDate: '2026-11-07T17:00:00Z',
      sport: 'football',
    }), null);
  });
});

describe('standings, season leaders, and records', () => {
  it('keeps the conference that contains BYU and skips empty records', () => {
    const table = parseConferenceStandings({
      children: [
        {
          name: 'SEC',
          standings: { entries: [{ team: { id: '99', shortDisplayName: 'Georgia' }, stats: [] }] },
        },
        {
          name: 'Big 12 Conference',
          standings: {
            entries: [
              {
                team: { id: '254', shortDisplayName: 'Utah' },
                stats: [
                  { name: 'gamesBehind', abbreviation: 'GB', displayValue: '-' },
                  { name: 'overall', abbreviation: 'overall', displayValue: '11-0' },
                  { name: 'gamesBehind', abbreviation: 'GB', displayValue: '-' },
                  { name: 'vs. Conf.', abbreviation: 'CONF', displayValue: '8-0' },
                  { name: 'streak', abbreviation: 'STRK', displayValue: 'W11' },
                ],
              },
              {
                team: { id: '252', shortDisplayName: 'BYU' },
                stats: [
                  { abbreviation: 'GB', displayValue: '2' },
                  { abbreviation: 'overall', displayValue: '9-2' },
                  { abbreviation: 'GB', displayValue: '2' },
                  { abbreviation: 'CONF', displayValue: '6-2' },
                  { abbreviation: 'STRK', displayValue: 'W2' },
                ],
              },
            ],
          },
        },
      ],
    }, '252');

    assert.ok(table);
    assert.equal(table.name, 'Big 12 Conference');
    assert.equal(table.rows[1].byu, true);
    assert.equal(table.rows[1].overall, '9-2');
    assert.equal(table.rows[1].conference, '6-2');
    assert.equal(table.rows[1].gamesBehind, '2');
    assert.equal(table.rows[0].gamesBehind, null);
  });

  it('names season leaders only when a display name is known', () => {
    const doc = {
      categories: [
        {
          name: 'passingLeader',
          displayName: 'Passing Leader',
          leaders: [{
            displayValue: '185/299, 2299 YDS',
            athlete: { $ref: 'https://sports.core.api.espn.com/v2/sports/football/athletes/5141367' },
          }],
        },
        {
          name: 'sacks',
          displayName: 'Sacks',
          leaders: [{ displayValue: '4', athlete: { $ref: 'https://example.com/athletes/9' } }],
        },
      ],
    };
    assert.deepEqual(athleteIdFromRef('https://example.com/athletes/5141367?x=1'), '5141367');
    assert.deepEqual(parseSeasonLeaders(doc, { '5141367': 'Bear Bachmeier' }), [{
      category: 'Passing Leader',
      name: 'Bear Bachmeier',
      line: '185/299, 2299 YDS',
    }]);
  });

  it('picks team averages that exist and skips the rest', () => {
    const averages = parseTeamAverages({
      results: {
        stats: {
          categories: [{
            stats: [
              { name: 'totalPointsPerGame', displayValue: '30.7' },
              { name: 'yardsPerGame', displayValue: '412.4' },
              { name: 'somethingElse', displayValue: '1' },
            ],
          }],
        },
      },
    });
    assert.deepEqual(averages, [
      { label: 'Points per game', value: '30.7' },
      { label: 'Yards per game', value: '412.4' },
    ]);
  });

  it('counts a draw in the record when ESPN has no record line', () => {
    const record = recordFromGames([
      game({ id: '1', opponent: 'UCLA', start: '2026-11-01T00:00:00Z', byuWinner: true }),
      game({ id: '2', opponent: 'Utah', start: '2026-11-08T00:00:00Z', byuWinner: null, byuScore: '1', opponentScore: '1' }),
      game({ id: '3', opponent: 'Kansas', start: '2026-11-15T00:00:00Z', state: 'pre', byuScore: null, opponentScore: null, byuWinner: null }),
    ]);
    assert.equal(record, '1-0-1');
  });
});

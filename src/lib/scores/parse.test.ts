import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildSport, chooseRevalidateSeconds, selectGames } from './assemble';
import { COLD_REVALIDATE_SECONDS, HOT_REVALIDATE_SECONDS, SCHEDULE_URL } from './constants';
import { footballSeasonYear, formatDenver, formatResult } from './format';
import {
  findStatBroadcastUrl,
  parseHydratedCoreEvent,
  parseSiteEvent,
  scheduleDocumentSchema,
} from './parse';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function load(name: string): unknown {
  return JSON.parse(readFileSync(join(fixtureDir, name), 'utf8'));
}

const NOW = Date.parse('2026-11-17T21:00:00Z');

describe('ESPN score parsers', () => {
  it('hydrates a final football game from the core event, not the competition date', () => {
    const event = load('football-core-event.json') as { competitions: Array<{ date?: string }> };
    event.competitions[0].date = '1999-01-01T00:00:00.000Z';

    const game = parseHydratedCoreEvent({
      event,
      status: load('football-status-final.json'),
      scores: {
        '252': load('football-score-byu.json'),
        '3101': load('football-score-opponent.json'),
      },
      broadcasts: load('football-broadcasts.json'),
      teamId: '252',
    });

    assert.ok(game);
    assert.equal(game.start, '2026-09-06T00:00:00.000Z');
    assert.equal(game.state, 'post');
    assert.equal(game.byuScore, '63');
    assert.equal(game.opponentScore, '7');
    assert.equal(game.byuWinner, true);
    assert.equal(game.opponent, 'Utah Tech');
    assert.equal(game.opponentAbbrev, 'UTU');
    assert.equal(game.homeAway, 'home');
    assert.equal(game.tv, 'ESPN+');
    assert.equal(formatResult(game), 'W 63–7');
  });

  it('ignores summary header.competitions[].date', () => {
    const header = load('football-summary-header.json') as {
      competitions: Array<{ date?: string }>;
    };
    header.competitions[0].date = '1999-01-01T00:00:00.000Z';

    const ignored = parseSiteEvent(header, { teamId: '252', source: 'summary' });
    assert.equal(ignored, null);

    const game = parseSiteEvent(header, {
      teamId: '252',
      source: 'summary',
      eventDate: '2026-09-06T00:00:00Z',
    });
    assert.ok(game);
    assert.equal(game.start, '2026-09-06T00:00:00.000Z');
    assert.equal(game.byuScore, '63');
    assert.equal(game.opponent, 'Utah Tech');
  });

  it('reads the football schedule event in America/Denver with TV and rank', () => {
    const doc = scheduleDocumentSchema.parse(load('football-schedule.json'));
    const game = parseSiteEvent(doc.events?.[0], { teamId: '252', source: 'event' });
    assert.ok(game);
    assert.equal(game.homeAway, 'away');
    assert.equal(game.opponent, 'Kansas');
    assert.equal(game.byuRank, 10);
    assert.equal(game.opponentRank, null);
    assert.equal(game.tv, 'ABC');
    assert.equal(game.state, 'pre');
    const when = formatDenver(game.start);
    assert.equal(when.date, 'Sat, Nov 21');
    assert.equal(when.time, '10:00 AM MST');
    assert.equal(doc.team?.recordSummary, '8-2');
    assert.equal(doc.team?.standingSummary, '3rd in Big 12');
  });

  it('splits the basketball schedule into last result, next game, and the games after that', () => {
    const doc = scheduleDocumentSchema.parse(load('basketball-schedule.json'));
    const games = (doc.events ?? [])
      .map((event) => parseSiteEvent(event, { teamId: '252', source: 'event' }))
      .filter((game): game is NonNullable<typeof game> => game !== null);
    const sport = buildSport({
      key: 'mens-basketball',
      label: "Men's Basketball",
      games,
      record: doc.team?.recordSummary ?? null,
      standing: doc.team?.standingSummary ?? null,
      scheduleUrl: SCHEDULE_URL['mens-basketball'],
    });
    assert.ok(sport);
    assert.equal(sport.record, '4-0');
    assert.equal(sport.standing, '1st in Big 12');
    assert.equal(sport.last?.opponent, 'Montana St');
    assert.equal(sport.last && formatResult(sport.last), 'W 86–71');
    assert.equal(sport.next?.opponent, 'N Colorado');
    assert.equal(sport.next?.homeAway, 'home');
    assert.deepEqual(sport.upcoming.map((game) => game.opponentAbbrev), ['WASH', 'NU']);
    assert.equal(sport.live, null);
    assert.equal(sport.liveStatsUrl, null);
  });

  it('parses a live scoreboard clock, period, and TV from string scores', () => {
    const game = parseSiteEvent(load('basketball-scoreboard-live.json'), {
      teamId: '248',
      source: 'scoreboard',
    });
    assert.ok(game);
    assert.equal(game.state, 'in');
    assert.equal(game.byuScore, '66');
    assert.equal(game.opponentScore, '54');
    assert.equal(game.clock, '8:19');
    assert.equal(game.period, 2);
    assert.equal(game.tv, 'ESPN');
    assert.equal(game.opponent, 'Rutgers');
    assert.equal(parseSiteEvent(load('basketball-scoreboard-live.json'), {
      teamId: '252',
      source: 'scoreboard',
    }), null);
  });

  it('uses a StatBroadcast URL only when the payload already contains one', () => {
    assert.equal(findStatBroadcastUrl(load('football-schedule.json')), null);
    assert.equal(
      findStatBroadcastUrl({
        links: [{ href: 'https://www.statbroadcast.com/events/statmonitr.php?gid=byu' }],
      }),
      'https://www.statbroadcast.com/events/statmonitr.php?gid=byu'
    );
  });
});

describe('score refresh window', () => {
  it('uses the football season year and a shorter revalidate near tipoff', () => {
    assert.equal(footballSeasonYear(new Date('2026-11-17T20:00:00Z')), 2026);
    assert.equal(footballSeasonYear(new Date('2027-01-15T18:00:00Z')), 2026);
    assert.equal(footballSeasonYear(new Date('2026-08-01T18:00:00Z')), 2026);

    const doc = scheduleDocumentSchema.parse(load('football-schedule.json'));
    const next = parseSiteEvent(doc.events?.[0], { teamId: '252', source: 'event' });
    assert.ok(next);
    const sport = buildSport({
      key: 'football',
      label: 'Football',
      games: [next],
      record: '8-2',
      standing: '3rd in Big 12',
      scheduleUrl: SCHEDULE_URL.football,
    });
    assert.equal(
      chooseRevalidateSeconds([sport], Date.parse('2026-11-21T14:00:00Z')),
      HOT_REVALIDATE_SECONDS
    );
    assert.equal(chooseRevalidateSeconds([sport], NOW), COLD_REVALIDATE_SECONDS);

    const live = { ...next, id: 'live-copy', state: 'in' as const };
    const { live: selected } = selectGames([live, next]);
    assert.equal(selected?.id, live.id);
    const liveSport = buildSport({
      key: 'football',
      label: 'Football',
      games: [live],
      record: '8-2',
      standing: null,
      scheduleUrl: SCHEDULE_URL.football,
    });
    assert.equal(chooseRevalidateSeconds([liveSport], NOW), HOT_REVALIDATE_SECONDS);
  });
});

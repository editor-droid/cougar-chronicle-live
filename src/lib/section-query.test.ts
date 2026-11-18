import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSectionQuery } from './section-query';

describe('parseSectionQuery', () => {
  it('defaults to the first page, newest first', () => {
    assert.deepEqual(parseSectionQuery({}), { page: 1, sort: 'desc' });
  });

  it('reads page and oldest sort', () => {
    assert.deepEqual(parseSectionQuery({ page: '3', sort: 'oldest' }), {
      page: 3,
      sort: 'asc',
    });
  });

  it('ignores junk page values', () => {
    assert.deepEqual(parseSectionQuery({ page: 'nope', sort: 'newest' }), {
      page: 1,
      sort: 'desc',
    });
  });
});

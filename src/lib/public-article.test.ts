import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPublicFreeArticle } from './public-article';

describe('isPublicFreeArticle', () => {
  it('allows a free story onto the shared article cache', () => {
    assert.equal(isPublicFreeArticle({ isPremium: false, printEditionId: null }), true);
  });

  it('keeps premium stories off the shared article cache', () => {
    assert.equal(isPublicFreeArticle({ isPremium: true, printEditionId: null }), false);
  });

  it('keeps print-edition stories off the shared article cache', () => {
    assert.equal(isPublicFreeArticle({ isPremium: false, printEditionId: 'edition' }), false);
  });
});

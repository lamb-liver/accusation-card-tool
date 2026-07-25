import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { loadCardCatalog, CARD_CATALOG_PATH } from '../src/utils/cardCatalog.js';

const expectedCards = JSON.parse(
  readFileSync(new URL('../public/cards.json', import.meta.url), 'utf8'),
);

function mockFetch(url) {
  assert.equal(url, CARD_CATALOG_PATH);
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(expectedCards),
  });
}

const cards = await loadCardCatalog({ fetch: mockFetch });

assert.equal(cards.length, expectedCards.length, 'card count');
assert.equal(cards[0]?.id, expectedCards[0]?.id, 'card order');
console.log('OK: card catalog tests passed');

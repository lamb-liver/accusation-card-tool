import { readFileSync } from 'node:fs';
import { loadCardCatalog, INDEX_PATH } from '../src/utils/cardCatalog.js';

const fixtureIndex = JSON.parse(
  readFileSync(new URL('../public/cards/index.json', import.meta.url), 'utf8'),
);
const fixtureShards = Object.fromEntries(
  fixtureIndex.shards.map(({ path }) => [
    path,
    JSON.parse(readFileSync(new URL(`../public${path}`, import.meta.url), 'utf8')),
  ]),
);
const expectedMerged = fixtureIndex.shards.flatMap(({ path }) => fixtureShards[path]);

function mockFetch(url) {
  if (url === INDEX_PATH) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(fixtureIndex),
    });
  }
  const data = fixtureShards[url];
  if (!data) throw new Error(`unexpected fetch: ${url}`);
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

let failed = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed += 1;
}

// Node mock fetch：應從 index + shards 載入並合併
const updates = [];
const { unchanged, hadDisplayableCache } = await loadCardCatalog({
  fetch: mockFetch,
  onUpdate: (cards) => updates.push(cards),
});

if (unchanged) fail('fresh load should not report unchanged');
if (hadDisplayableCache) fail('fresh load should not report displayable cache');
if (updates.length < 1) fail(`expected at least 1 onUpdate, got ${updates.length}`);

const lastUpdate = updates[updates.length - 1];
if (lastUpdate.length !== expectedMerged.length) {
  fail(`expected ${expectedMerged.length} cards in final update, got ${lastUpdate.length}`);
}
if (lastUpdate[0]?.id !== expectedMerged[0]?.id) {
  fail('merged card order mismatch');
}

// onCacheMiss：尚無可顯示快取、發起網路前應觸發
let cacheMissed = false;
await loadCardCatalog({
  fetch: mockFetch,
  onCacheMiss: () => {
    cacheMissed = true;
  },
});

if (!cacheMissed) fail('onCacheMiss should run when no prior displayable cache');

if (failed === 0) {
  console.log('OK: card catalog tests passed');
} else {
  process.exit(1);
}

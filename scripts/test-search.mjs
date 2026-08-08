import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  filterAndRankCards,
  normalizeSearchText,
} from '../src/utils/cardFilterLogic.js';

const cards = JSON.parse(readFileSync(new URL('../public/cards.json', import.meta.url), 'utf8'));
const noFilters = { faction: '', type: '', symbol: '', mechanic: '' };

const firstCases = [
  ['第十三夜', 'cro01'],
  ['第十三', 'cro01'],
  ['十三夜', 'cro01'],
  ['第 十 三 夜...', 'cro01'],
  ['ＣＲＯ－０１', 'cro01'],
  ['cro01', 'cro01'],
  ['ＤＯＲ—１１', 'dor11'],
  ['Δ議會', 'dor11'],
  ['雪白尾', 'fox01'],
  ['神巫', 'fox05'],
  ['詠頌', 'cro01'],
  ['抽1張牌', 'cro01'],
  ['駐守', 'fox08'],
  ['解構', 'dor05'],
];

for (const [query, expectedId] of firstCases) {
  const result = filterAndRankCards(cards, query, noFilters);
  assert.equal(result[0]?.id, expectedId, `${JSON.stringify(query)} first result`);
}

assert.equal(normalizeSearchText(' Ａ B-C… '), 'abc', 'NFKC/space/punctuation normalization');
assert.equal(normalizeSearchText('Δ 議會'), 'δ議會', 'meaningful symbols survive normalization');
assert.deepEqual(filterAndRankCards(cards, '完全不存在的卡名', noFilters), [], 'zero result');
assert(
  filterAndRankCards(cards, '詠頌', { ...noFilters, faction: '白狐神社' }).every(
    (card) => card.faction === '白狐神社',
  ),
  'faction filter combines with ranked search',
);
assert(
  filterAndRankCards(cards, '破壞', { ...noFilters, type: '魔法' }).every(
    (card) => card.type === '魔法',
  ),
  'type filter combines with ranked search',
);
assert(
  filterAndRankCards(cards, '', { ...noFilters, symbol: '知識' }).every(
    (card) => card.symbols?.includes('知識'),
  ),
  'symbol-only filter',
);
assert(
  filterAndRankCards(cards, '', { ...noFilters, mechanic: '供品' }).every(
    (card) => card.effect?.includes('供品'),
  ),
  'mechanic-only filter',
);

const originalOrder = cards.slice(0, 5).map((card) => card.id);
assert.deepEqual(
  filterAndRankCards(cards, '', noFilters).slice(0, 5).map((card) => card.id),
  originalOrder,
  'blank query preserves catalog order',
);

console.log(`OK: ${firstCases.length + 6} golden search cases passed`);

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

// 灰燼皇后（mot01）曾把「一」誤植成注音「ㄧ」，搜「限一次」會漏掉
assert(
  filterAndRankCards(cards, '限一次', noFilters).some((card) => card.id === 'mot01'),
  '限一次 finds mot01',
);

// 直接打教團名：整個教團都要列出，且卡名命中的卡仍排在前面
for (const [query, faction] of [
  ['鴉教團', '鴉教團'],
  ['疫病中心', '疫病中心'],
  ['疫病', '疫病中心'],
  ['紫靈山', '紫靈山'],
]) {
  const result = filterAndRankCards(cards, query, noFilters);
  const factionCount = cards.filter((card) => card.faction === faction).length;
  assert.equal(
    result.filter((card) => card.faction === faction).length,
    factionCount,
    `${query} lists every ${faction} card`,
  );
}
assert.equal(filterAndRankCards(cards, '黑色葬禮', noFilters)[0]?.id, 'cro02', 'name match still ranks first');
assert(
  filterAndRankCards(cards, '門', noFilters).length < cards.filter((card) => card.faction === '門教團').length,
  'single-character query does not pull in a whole faction',
);

for (const mechanic of ['附著', '飛升']) {
  const result = filterAndRankCards(cards, '', { ...noFilters, mechanic });
  assert(result.length > 0, `${mechanic} filter has results`);
  assert(result.every((card) => card.effect?.includes(mechanic)), `${mechanic} filter matches effect`);
}

const originalOrder = cards.slice(0, 5).map((card) => card.id);
assert.deepEqual(
  filterAndRankCards(cards, '', noFilters).slice(0, 5).map((card) => card.id),
  originalOrder,
  'blank query preserves catalog order',
);

console.log(`OK: ${firstCases.length + 14} golden search cases passed`);

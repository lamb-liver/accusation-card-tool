import { readFileSync } from 'node:fs';
import {
  filterCardsByRule,
  sortCardsForRuleDisplay,
  isCardAllowedInRulePool,
  getMainDeckFactionDecision,
  checkSpecialCardFaction,
} from '../src/rules/index.js';

const cards = JSON.parse(readFileSync(new URL('../public/cards.json', import.meta.url), 'utf8'));

let failed = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed += 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

// ── rule1 展示篩選 ─────────────────────────────────────────────────────────
const rule1 = { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' };
const rule1Pool = filterCardsByRule(cards, rule1);

assert(rule1Pool.every((c) => c.faction === '鴉教團' || c.faction === '放逐者'), 'rule1 pool only primary + exile');
assert(
  !rule1Pool.some((c) => c.faction === '白狐神社'),
  'rule1 pool excludes other factions',
);

// ── rule2 展示篩選：次要教團無教主／儀式 ───────────────────────────────────
const rule2 = { isActive: true, type: 'rule2', primary: '鴉教團', secondary: '白狐神社' };
const pool = sortCardsForRuleDisplay(filterCardsByRule(cards, rule2), rule2);

const secondaryCards = pool.filter((c) => c.faction === rule2.secondary);
assert(
  !secondaryCards.some((c) => c.type === '教主' || c.type === '儀式'),
  'secondary block must not include 教主 or 儀式',
);

const primaryEnd = pool.findIndex((card) => card.faction !== rule2.primary);
const secondaryStart = pool.findIndex((card) => card.faction === rule2.secondary);
const exileStart = pool.findIndex((card) => card.faction === '放逐者');

if (primaryEnd === -1 || pool.slice(0, primaryEnd).some((card) => card.faction !== rule2.primary)) {
  fail('primary faction block must come first');
}

if (secondaryStart !== -1 && secondaryStart < primaryEnd) {
  fail('secondary faction must appear after primary');
}

if (exileStart !== -1 && secondaryStart !== -1 && exileStart < secondaryStart) {
  fail('exile cards must appear after secondary');
}

const phases = [];
for (const card of pool) {
  if (card.faction === rule2.primary) phases.push('primary');
  else if (card.faction === rule2.secondary) phases.push('secondary');
  else if (card.faction === '放逐者') phases.push('exile');
  else phases.push('other');
}

const firstSecondary = phases.indexOf('secondary');
const firstExile = phases.indexOf('exile');
const lastPrimary = phases.lastIndexOf('primary');

if (firstSecondary !== -1 && lastPrimary > firstSecondary) {
  fail('primary and secondary blocks must not interleave');
}

if (firstExile !== -1 && firstSecondary !== -1) {
  const lastSecondary = phases.lastIndexOf('secondary');
  if (lastSecondary > firstExile) {
    fail('secondary and exile blocks must not interleave');
  }
}

// ── 組牌合法性 ─────────────────────────────────────────────────────────────
const sampleMain = cards.find((c) => c.type === '信徒' && c.faction === '白狐神社');
const sampleLeader = cards.find((c) => c.type === '教主' && c.faction === '鴉教團');

if (sampleMain) {
  const decision = getMainDeckFactionDecision(sampleMain, rule2);
  assert(decision.kind === 'allow', 'secondary faction main card allowed under rule2');

  assert(
    isCardAllowedInRulePool(sampleMain, rule2),
    'pool display allows secondary main-type card',
  );
}

if (sampleLeader) {
  assert(checkSpecialCardFaction(sampleLeader, rule2) === null, 'primary leader passes special check');
  const wrongFactionLeader = { ...sampleLeader, faction: '白狐神社' };
  assert(
    checkSpecialCardFaction(wrongFactionLeader, rule2) !== null,
    'non-primary leader fails special check',
  );
}

const thirdFaction = cards.find((c) => c.faction !== rule2.primary && c.faction !== rule2.secondary && c.faction !== '放逐者');
if (thirdFaction) {
  const deny = getMainDeckFactionDecision(thirdFaction, { ...rule2, secondary: '白狐神社' });
  assert(deny.kind === 'deny', 'third faction denied when rule2 has secondary');
  assert(!isCardAllowedInRulePool(thirdFaction, rule2), 'third faction not in pool');
}

const askSecondary = getMainDeckFactionDecision(
  sampleMain ?? { faction: '白狐神社' },
  { isActive: true, type: 'rule2', primary: '鴉教團', secondary: '' },
);
assert(askSecondary.kind === 'ask_secondary', 'missing secondary triggers ask_secondary');

if (failed === 0) {
  console.log('OK: rule engine contract tests passed');
  console.log('Counts (rule2 pool):', {
    primary: pool.filter((c) => c.faction === rule2.primary).length,
    secondary: pool.filter((c) => c.faction === rule2.secondary).length,
    exile: pool.filter((c) => c.faction === '放逐者').length,
  });
}

process.exit(failed > 0 ? 1 : 0);

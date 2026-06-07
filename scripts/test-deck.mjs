import {
  getAddBlockReason,
  getDeckTotal,
  checkMainCapacity,
  getPoolBlockedCardIds,
  validateDeckComposition,
} from '../src/deck/rules.js';
import { upsertSavedDeck, findSavedDeckByName } from '../src/deck/savedDecks.js';
import {
  validateImportedJson,
  buildDeckTextExport,
  createDeckFromJsonIds,
  createDeckFromText,
} from '../src/deck/importExport.js';
import { normalizeDeck, normalizeSavedDeckEntry, persistStatePatch } from '../src/deck/storage.js';
import { sanitizePersistedDeckState } from '../src/deck/persistedState.js';
import { collectDeckStructureViolations } from '../src/deck/deckCompositionRules.js';
import { STORAGE_KEY, SAVED_DECKS_KEY, RULE_STATE_KEY } from '../src/deck/constants.js';
import { createDeckController } from '../src/deck/createDeckController.js';

let failed = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed += 1;
}

const sampleCard = {
  id: 'cro01',
  name: '測試卡',
  faction: '鴉教團',
  type: '信徒',
};

const deck = {
  leader: [],
  rituals: [],
  main: [sampleCard],
};

if (getDeckTotal(deck) !== 1) fail('getDeckTotal');
if (checkMainCapacity(deck)) fail('checkMainCapacity should pass for small deck');

const dup = getAddBlockReason(sampleCard, deck, { isActive: false, type: 'rule1', primary: '', secondary: '' });
if (!dup.blocked) fail('duplicate card should block');

const fullMainDeck = {
  leader: [],
  rituals: [],
  main: Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, name: `卡${i}`, faction: '鴉教團', type: '信徒' })),
};
const capBlock = getAddBlockReason(
  { id: 'new01', name: '新卡', faction: '鴉教團', type: '信徒' },
  fullMainDeck,
  { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' },
);
if (!capBlock.blocked) fail('main full should block via getAddBlockReason');

const poolBlocked = getPoolBlockedCardIds(
  fullMainDeck,
  { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' },
  [{ id: 'new01', name: '新卡', faction: '鴉教團', type: '信徒' }],
);
if (!poolBlocked.has('new01')) fail('getPoolBlockedCardIds should match getAddBlockReason');

const rule1Active = { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' };
const wrongFaction = getAddBlockReason(
  { id: 'fox01', name: '狐卡', faction: '白狐神社', type: '信徒' },
  { leader: [], rituals: [], main: [] },
  rule1Active,
);
if (!wrongFaction.blocked || !wrongFaction.reason.includes('鴉教團')) {
  fail('rule1 wrong faction should block in getAddBlockReason');
}

const normalized = normalizeDeck({ leader: [{ id: 'a', name: 'A' }], rituals: 'bad', main: null });
if (normalized.leader.length !== 1 || normalized.rituals.length !== 0 || normalized.main.length !== 0) {
  fail('normalizeDeck should coerce invalid sections');
}

const { deck: importedDeck, missingIds } = createDeckFromJsonIds(
  { leader: [], rituals: [], main: ['cro01', 'missing-id'] },
  [sampleCard],
);
if (importedDeck.main.length !== 1 || missingIds.length !== 1 || missingIds[0] !== 'missing-id') {
  fail('createDeckFromJsonIds missingIds');
}

const saved = [];
const first = upsertSavedDeck(saved, '測試', deck, { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' }, 10);
if (first.kind !== 'added' || first.next.length !== 1) fail('upsertSavedDeck add');
if (!findSavedDeckByName(first.next, '測試')) fail('findSavedDeckByName');

if (validateImportedJson({ version: 2, deck: { leader: [], rituals: [], main: [] } })) {
  fail('validateImportedJson valid payload');
}
if (!validateImportedJson({ version: 'x' })) fail('validateImportedJson invalid');

const text = buildDeckTextExport(deck, { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' });
if (!text.includes('測試卡') || !text.includes('cro01')) fail('buildDeckTextExport');

const overfull = validateDeckComposition(
  { leader: [], rituals: [], main: Array.from({ length: 21 }, (_, i) => ({ ...sampleCard, id: `x${i}` })) },
  { isActive: false, type: 'rule1', primary: '', secondary: '' },
);
if (overfull.valid) fail('validateDeckComposition should reject overfull main');

const badDeckForAlign = {
  leader: [],
  rituals: [],
  main: Array.from({ length: 21 }, (_, i) => ({ ...sampleCard, id: `y${i}` })),
};
const inactiveRule = { isActive: false, type: 'rule1', primary: '', secondary: '' };
if (collectDeckStructureViolations(badDeckForAlign, inactiveRule).length === 0) {
  fail('collectDeckStructureViolations should list violations');
}
if (validateDeckComposition(badDeckForAlign, inactiveRule).valid) {
  fail('validateDeckComposition should use collectDeckStructureViolations');
}

const rule2ThirdFaction = validateDeckComposition(
  {
    leader: [],
    rituals: [],
    main: [{ id: 'fox01', name: '狐卡', faction: '白狐神社', type: '信徒' }],
  },
  { isActive: true, type: 'rule2', primary: '鴉教團', secondary: '' },
);
if (rule2ThirdFaction.valid) {
  fail('validateDeckComposition should reject rule2 main without secondary when wrong faction');
}

const roundTripDeck = createDeckFromText(
  buildDeckTextExport(deck, { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' }),
  [sampleCard],
);
if (roundTripDeck.main.length !== 1 || roundTripDeck.main[0].id !== 'cro01') {
  fail('text export/import round-trip by card id');
}

const oldFormatDeck = createDeckFromText(
  '【控訴】牌組清單\n主牌組（1/20）\n  · 測試卡（鴉教團）',
  [sampleCard],
);
if (oldFormatDeck.main.length !== 1 || oldFormatDeck.main[0].id !== 'cro01') {
  fail('text import should support old name/faction format');
}

if (!validateImportedJson({ version: 2, deck: { leader: [], rituals: [], main: new Array(33).fill('x') } })) {
  fail('validateImportedJson should reject oversized main array');
}

const sanitized = sanitizePersistedDeckState(
  { leader: [], rituals: [], main: Array.from({ length: 21 }, (_, i) => ({ ...sampleCard, id: `c${i}` })) },
  { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' },
  '鴉教團',
  '',
);
if (!sanitized.wasSanitized || sanitized.deck.main.length !== 0) {
  fail('sanitizePersistedDeckState should reset corrupt deck');
}

let toastCount = 0;
const controller = createDeckController({
  allCards: [sampleCard],
  showToast: () => {
    toastCount += 1;
  },
  showConfirm: async () => true,
  showPrompt: async () => null,
});

controller.removeFromDeck('cro01');
if (getDeckTotal(controller.getSnapshot().deck) !== 0) fail('removeFromDeck via controller');

controller.applyRuleLogic('rule1', '鴉教團', '');
await controller.addToDeck(sampleCard);
if (getDeckTotal(controller.getSnapshot().deck) !== 1) fail('addToDeck via controller');
if (toastCount < 1) fail('addToDeck should toast');

// 規則未啟用：確認教團後應同步自動加入（不需第二次點擊）
const isolated = createDeckController({
  allCards: [sampleCard],
  showToast: () => {},
  showConfirm: async () => true,
  showPrompt: async () => null,
});
isolated.setCurrentRule(() => ({ isActive: false, type: 'rule1', primary: '', secondary: '' }));
isolated.setPrimaryFaction('');
isolated.setSecondaryFaction('');
isolated.setDeck({ leader: [], rituals: [], main: [] });

await isolated.addToDeck(sampleCard);

const snapAfter = isolated.getSnapshot();
if (!snapAfter.currentRule.isActive) fail('inactive rule flow should activate rule');
if (getDeckTotal(snapAfter.deck) !== 1) fail('inactive rule flow should add card after confirm');

const savedEntry = normalizeSavedDeckEntry({
  name: ' 測試組 ',
  deck: { leader: [{ id: 'l1', name: 'L' }], rituals: null, main: [] },
  savedAt: 'bad',
});
if (!savedEntry || savedEntry.name !== '測試組' || savedEntry.deck.leader.length !== 1) {
  fail('normalizeSavedDeckEntry');
}

const savedWithRule = normalizeSavedDeckEntry({
  name: '規則組',
  deck: { leader: [], rituals: [], main: [] },
  rule: { isActive: true, type: 'not-a-rule', primary: '鴉教團', secondary: '' },
});
if (!savedWithRule?.rule || savedWithRule.rule.type !== 'rule1') {
  fail('normalizeSavedDeckEntry should normalize rule via normalizeImportedRule');
}

// React hook 初始化時 allCards 可能仍是空陣列；setAllCards 後 import handlers 必須使用最新卡表。
{
  const importToasts = [];
  const importCtl = createDeckController({
    allCards: [],
    showToast: (message, type) => importToasts.push({ message, type }),
    showConfirm: async () => true,
    showPrompt: async () =>
      JSON.stringify({
        version: 2,
        rule: { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' },
        deck: { leader: [], rituals: [], main: ['cro01'] },
      }),
  });
  importCtl.setAllCards([sampleCard]);
  await importCtl.importDeck();
  const imported = importCtl.getSnapshot().deck;

  if (imported.main.length !== 1 || imported.main[0].id !== 'cro01') {
    fail('importDeck should use latest allCards after setAllCards');
  }
  if (!importToasts.some((t) => t.message.includes('JSON 匯入成功'))) {
    fail('importDeck should toast JSON success when IDs resolve');
  }
}

// 冷啟動：損壞的 active deck 應重置
{
  const store = new Map();
  const previousLs = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };

  store.set(
    STORAGE_KEY,
    JSON.stringify({
      leader: [],
      rituals: [],
      main: Array.from({ length: 21 }, (_, i) => ({ ...sampleCard, id: `cold${i}` })),
    }),
  );
  store.set(
    RULE_STATE_KEY,
    JSON.stringify({
      currentRule: { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' },
      primaryFaction: '鴉教團',
      secondaryFaction: '',
    }),
  );

  const coldToasts = [];
  const coldCtl = createDeckController({
    allCards: [sampleCard],
    showToast: (message) => coldToasts.push(message),
    showConfirm: async () => true,
    showPrompt: async () => null,
  });
  if (getDeckTotal(coldCtl.getSnapshot().deck) !== 0) fail('cold start should reset corrupt active deck');
  if (!coldToasts.some((m) => m.includes('重置'))) fail('cold start should toast reset warning');

  if (previousLs) globalThis.localStorage = previousLs;
  else delete globalThis.localStorage;
}

// saveDeckAs：不合法牌組不應寫入已存列表
{
  const saveToasts = [];
  const saveCtl = createDeckController({
    allCards: [sampleCard],
    showToast: (message) => saveToasts.push(message),
    showConfirm: async () => true,
    showPrompt: async () => null,
  });
  const invalidDeck = {
    leader: [],
    rituals: [],
    main: Array.from({ length: 21 }, (_, i) => ({ ...sampleCard, id: `save${i}` })),
  };
  if (!saveCtl.setDeck(invalidDeck)) fail('setDeck should succeed for in-memory invalid deck');
  saveCtl.setCurrentRule(() => ({ isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' }));
  await saveCtl.saveDeckAs('不該成功');
  if (!saveToasts.some((m) => m.includes('無法儲存'))) fail('saveDeckAs should reject invalid composition');
  if (saveCtl.getSnapshot().savedDecks.length > 0) fail('saveDeckAs should not persist invalid saved deck');
}

// loadSavedDeckByName：損壞的已存牌組不應覆蓋現有牌組
{
  const store = new Map();
  const previousLs = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };

  store.set(STORAGE_KEY, JSON.stringify({ leader: [], rituals: [], main: [sampleCard] }));
  store.set(
    SAVED_DECKS_KEY,
    JSON.stringify([
      {
        name: '損壞組',
        deck: {
          leader: [],
          rituals: [],
          main: Array.from({ length: 21 }, (_, i) => ({ ...sampleCard, id: `bad${i}` })),
        },
        rule: { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' },
        savedAt: Date.now(),
      },
    ]),
  );
  store.set(
    RULE_STATE_KEY,
    JSON.stringify({
      currentRule: { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' },
      primaryFaction: '鴉教團',
      secondaryFaction: '',
    }),
  );

  const loadToasts = [];
  const loadCtl = createDeckController({
    allCards: [sampleCard],
    showToast: (message, type) => loadToasts.push({ message, type }),
    showConfirm: async () => true,
    showPrompt: async () => null,
  });
  const beforeTotal = getDeckTotal(loadCtl.getSnapshot().deck);
  await loadCtl.loadSavedDeckByName('損壞組');
  const afterTotal = getDeckTotal(loadCtl.getSnapshot().deck);
  const rejected = loadToasts.some((t) => t.message.includes('無法載入'));

  if (afterTotal !== beforeTotal) fail('loadSavedDeckByName should not apply invalid saved deck');
  if (!rejected) fail('loadSavedDeckByName should toast when saved deck is invalid');

  if (previousLs) globalThis.localStorage = previousLs;
  else delete globalThis.localStorage;
}

// persistStatePatch：第二步失敗時回滾第一步
{
  const store = new Map();
  let setCalls = 0;
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      setCalls += 1;
      if (setCalls === 2) throw new Error('fail on second key');
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };

  const deckA = { leader: [], rituals: [], main: [{ id: 'a', name: 'A', faction: '鴉教團', type: '信徒' }] };
  const deckB = { leader: [], rituals: [], main: [] };
  store.set(STORAGE_KEY, JSON.stringify(deckA));

  let threw = false;
  try {
    persistStatePatch(
      {
        deck: deckB,
        savedDecks: [],
        currentRule: { isActive: true, type: 'rule1', primary: '鴉教團', secondary: '' },
        primaryFaction: '鴉教團',
        secondaryFaction: '',
      },
      { deck: true, savedDecks: true, rule: true },
    );
  } catch {
    threw = true;
  }

  const deckOnDisk = JSON.parse(store.get(STORAGE_KEY));
  if (!threw) fail('persistStatePatch should throw on second key failure');
  if (deckOnDisk.main.length !== 1 || deckOnDisk.main[0].id !== 'a') {
    fail('persistStatePatch should rollback first key on later failure');
  }
}

// 持久化失敗：不應出現成功 toast，且記憶體狀態不應套用 patch
{
  const store = new Map();
  const previousLs = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };

  const toasts = [];
  const persistCtl = createDeckController({
    allCards: [sampleCard],
    showToast: (message, type) => toasts.push({ message, type }),
    showConfirm: async () => true,
    showPrompt: async () => null,
  });
  persistCtl.setDeck({ leader: [], rituals: [], main: [sampleCard] });
  const deckBefore = getDeckTotal(persistCtl.getSnapshot().deck);

  await persistCtl.saveDeckAs('應失敗');

  const deckAfter = getDeckTotal(persistCtl.getSnapshot().deck);
  const hasPersistError = toasts.some((t) => t.type === 'error' && t.message.includes('存檔失敗'));
  const hasSavedSuccess = toasts.some((t) => t.message.includes('已儲存'));
  if (!hasPersistError || hasSavedSuccess) fail('persist failure should error without success toast');
  if (deckAfter !== deckBefore) fail('persist failure should not apply savedDecks patch to memory');

  if (previousLs) globalThis.localStorage = previousLs;
  else delete globalThis.localStorage;
}

if (failed === 0) {
  console.log('OK: deck domain tests passed');
} else {
  process.exit(1);
}

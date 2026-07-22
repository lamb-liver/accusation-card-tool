import {
  ShareWallApiError,
  fetchAdminSubmissions,
  fetchPublicDeck,
  fetchPublicDecks,
  submitPublicDeck,
} from '../src/api/shareWallApi.js';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../src/api/csrfHeader.generated.js';
import {
  CARD_ART_CHANGED_EVENT,
  cardHasAlternateArt,
  getCardImageFullSrc,
  getCardImageSrc,
  getCardPictureSources,
  getStoredArtVariant,
  setStoredArtVariant,
} from '../src/utils/cardAlternateArt.js';
import { cardMatchesFilters, filterCardIndices } from '../src/utils/cardFilterLogic.js';
import { getCardMetaCells, getCardStats, formatCardNumber } from '../src/utils/cardMeta.js';
import { formatApiDate } from '../src/utils/formatApiDate.js';
import { formatShareWallError } from '../src/utils/formatShareWallError.js';
import { ruleToApiPayload, apiRuleToDeckRule } from '../src/utils/shareWallRule.js';
import { factionIconPath } from '../src/constants/factionOrder.js';
import { parseHashRoute, parseHashQuery, buildHash } from '../src/hooks/useHashRoute.js';
import { pickFilters, FILTER_KEYS } from '../src/hooks/useCardFilters.js';
import { applyStatusChangeToList } from '../src/components/admin/useAdminSubmissions.js';
import {
  collectDeckSymbolCounts,
  getTotalSymbolCount,
  SYMBOL_ORDER,
} from '../src/deck/deckSymbolStats.js';

let failed = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed += 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    fail(`${message}: expected ${expectedJson}, got ${actualJson}`);
  }
}

// ── hash route parsing ─────────────────────────────────────────────────────
assertDeepEqual(parseHashRoute(''), { kind: 'home' }, 'empty hash routes home');
assertDeepEqual(parseHashRoute('#/deck'), { kind: 'deck' }, 'deck hash route');
assertDeepEqual(
  parseHashRoute('#/decks/share%2Fid'),
  { kind: 'deck-detail', shareId: 'share/id' },
  'deck detail share id should decode',
);
assertDeepEqual(
  parseHashRoute('#/decks'),
  { kind: 'community', communityScroll: 'decks' },
  'decks route opens community deck list',
);
assertDeepEqual(
  parseHashRoute('#community-guestbook'),
  { kind: 'community', communityScroll: 'guestbook' },
  'legacy guestbook anchor route',
);
assertDeepEqual(parseHashRoute('#/admin'), { kind: 'admin' }, 'admin hash route');
assertDeepEqual(parseHashRoute('#/unknown'), { kind: 'home' }, 'unknown hash routes home');

// query 不可污染 path 判定：'#/deck?q=x' 若整串當 path 會誤判成 home
assertDeepEqual(parseHashRoute('#/deck?q=夜'), { kind: 'deck' }, 'route ignores the query string');
assertDeepEqual(
  parseHashRoute('#/qa/鴉教團?card=cro01'),
  { kind: 'qa', qaCategory: '鴉教團' },
  'route with both a path segment and a query',
);
assertDeepEqual(parseHashRoute('#/?q=夜'), { kind: 'home' }, 'home route with query only');

// ── hash query 解析與組裝 ──────────────────────────────────────────────────
assertDeepEqual(parseHashQuery('#/'), {}, 'no query yields an empty object');
assertDeepEqual(
  parseHashQuery('#/?q=夜幕&faction=鴉教團&card=cro01'),
  { q: '夜幕', faction: '鴉教團', card: 'cro01' },
  'query params are decoded into an object',
);
// 空值等同未設定，否則會在網址留下 `?q=` 這種無意義殘留
assertDeepEqual(parseHashQuery('#/?q=&faction=鴉教團'), { faction: '鴉教團' }, 'blank values are dropped');

assert(buildHash('deck', {}) === '#/deck', 'empty query leaves no trailing question mark');
assert(buildHash('', {}) === '#/', 'empty path builds the root hash');
assert(buildHash('deck', { q: '夜', faction: '' }) === '#/deck?q=%E5%A4%9C', 'blank values are omitted');
assertDeepEqual(
  parseHashQuery(buildHash('', { q: '夜 幕', card: 'cro01' })),
  { q: '夜 幕', card: 'cro01' },
  'build/parse round-trips values needing escaping',
);

// ── 篩選白名單 ─────────────────────────────────────────────────────────────
// 網址由使用者任意編輯，不可整包展開進 state
assertDeepEqual(
  pickFilters({ faction: '鴉教團', evil: 'x', q: '夜' }),
  { faction: '鴉教團', type: '', symbol: '', mechanic: '' },
  'only whitelisted filter keys are picked',
);
assertDeepEqual(
  pickFilters({ faction: 123, type: null }),
  { faction: '', type: '', symbol: '', mechanic: '' },
  'non-string filter values fall back to empty',
);
assertDeepEqual(
  pickFilters(undefined),
  { faction: '', type: '', symbol: '', mechanic: '' },
  'missing source yields all-empty filters',
);
assert(FILTER_KEYS.length === 4, 'filter key list covers the four dimensions');

// ── card filter pure logic ─────────────────────────────────────────────────
const cards = [
  {
    id: 'cro01',
    name: '第十三夜',
    effect: '抽一張牌。放逐。',
    faction: '鴉教團',
    type: '教主',
    symbols: ['知識', '禁忌'],
  },
  {
    id: 'fox05',
    name: '神巫',
    effect: '',
    faction: '白狐神社',
    type: '信徒',
    symbols: ['自然'],
  },
  {
    id: 'dor03',
    name: '無效果卡',
    faction: '門教團',
    type: '魔法',
  },
];

assert(cardMatchesFilters(cards[0], '第十三', { faction: '', type: '', symbol: '', mechanic: '' }), 'search matches name');
assert(cardMatchesFilters(cards[0], '放逐', { faction: '', type: '', symbol: '', mechanic: '' }), 'search matches effect');
assert(
  cardMatchesFilters(cards[0], '', { faction: '鴉教團', type: '教主', symbol: '知識', mechanic: '抽' }),
  'combined filters should match',
);
assert(
  !cardMatchesFilters(cards[2], '', { faction: '', type: '', symbol: '知識', mechanic: '' }),
  'symbol filter should fail when symbols are missing',
);
// 卡面編號搜尋：CRO-01 / cro01 / CRO01 皆應命中 id 'cro01'
const noFilters = { faction: '', type: '', symbol: '', mechanic: '' };
assert(cardMatchesFilters(cards[0], 'CRO-01', noFilters), 'search matches printed number CRO-01');
assert(cardMatchesFilters(cards[0], 'cro01', noFilters), 'search matches raw id cro01');
assert(cardMatchesFilters(cards[0], 'CRO01', noFilters), 'search matches CRO01 without hyphen');
assert(!cardMatchesFilters(cards[1], 'CRO-01', noFilters), 'id search should not match other cards');

// formatCardNumber：cro01 → CRO-01、mot12 → MOT-12
assert(formatCardNumber('cro01') === 'CRO-01', 'formatCardNumber cro01');
assert(formatCardNumber('mot12') === 'MOT-12', 'formatCardNumber mot12');
assert(formatCardNumber('kit24') === 'KIT-24', 'formatCardNumber kit24');
assertDeepEqual(
  filterCardIndices(cards, '', { faction: '', type: '信徒', symbol: '', mechanic: '' }),
  [1],
  'filterCardIndices returns original indices',
);

// ── share-wall rule mapping ────────────────────────────────────────────────
assertDeepEqual(
  ruleToApiPayload({ isActive: true, type: 'rule1', primary: '鴉教團', secondary: '白狐神社' }),
  { type: 'rule1', primary: '鴉教團', secondary: '' },
  'rule1 api payload strips secondary faction',
);
assertDeepEqual(
  apiRuleToDeckRule({ type: 'rule2', primary: '鴉教團', secondary: '白狐神社' }),
  { isActive: true, type: 'rule2', primary: '鴉教團', secondary: '白狐神社' },
  'api rule2 maps to active deck rule',
);
assertDeepEqual(
  apiRuleToDeckRule({ type: 'bad', primary: 123, secondary: '白狐神社' }),
  { isActive: true, type: 'rule1', primary: '', secondary: '' },
  'invalid api rule falls back to active rule1',
);

// ── card metadata and image helpers ────────────────────────────────────────
assertDeepEqual(
  getCardStats({ type: '信徒', volume: 2, calamity: 1 }),
  [
    { label: '聲量', value: 2 },
    { label: '災厄', value: 1 },
  ],
  'follower stats include volume and calamity',
);
assertDeepEqual(
  getCardStats({ type: '地點', guard: 3, calamity: 0 }),
  [{ label: '守護', value: 3 }],
  'location zero calamity is hidden',
);
assert(
  getCardMetaCells({ faction: '未知', type: '地點', locationType: '' }).some(
    (cell) => cell.key === 'locationType' && cell.content === '—',
  ),
  'location metadata falls back to placeholder',
);
assert(cardHasAlternateArt({ hasAlternateArt: true, alternateSource: 'artist' }), 'alternate art requires source');
assert(!cardHasAlternateArt({ hasAlternateArt: true, alternateSource: '  ' }), 'blank alternate source is not alternate art');
assert(getCardImageSrc('cro01', 'alt', 160) === 'images/cro01alt-w160.webp', 'alt card responsive webp path');
assert(getCardImageFullSrc('cro01', 'main') === 'images/cro01-w640.webp', 'full image path');
assert(
  getCardPictureSources('cro01', 'alt').avifSrcSet.includes('images/cro01alt-w640.avif 640w'),
  'picture sources include modal width avif',
);
assert(factionIconPath('鴉教團', '右') === 'images/icons/鴉教團右.webp', 'faction icon path');

{
  const previousLocalStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;
  const store = new Map();
  const dispatched = [];

  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  globalThis.window = {
    dispatchEvent: (event) => dispatched.push(event),
  };

  assert(getStoredArtVariant('cro01') === 'main', 'missing stored art variant defaults main');
  setStoredArtVariant('cro01', 'alt');
  assert(getStoredArtVariant('cro01') === 'alt', 'stored alt variant round trips');
  setStoredArtVariant('cro01', 'main');
  assert(getStoredArtVariant('cro01') === 'main', 'main variant clears stored override');
  assert(
    dispatched.some((event) => event.type === CARD_ART_CHANGED_EVENT && event.detail.cardId === 'cro01'),
    'setStoredArtVariant dispatches card art change event',
  );

  if (previousLocalStorage) globalThis.localStorage = previousLocalStorage;
  else delete globalThis.localStorage;
  if (previousWindow) globalThis.window = previousWindow;
  else delete globalThis.window;
  if (previousCustomEvent) globalThis.CustomEvent = previousCustomEvent;
  else delete globalThis.CustomEvent;
}

// ── share-wall API client and error formatting ────────────────────────────
{
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return { ok: true, status: 200, text: async () => '{"ok":true}' };
  };

  await fetchPublicDecks({ limit: 10, cursor: 'CUR50R' });
  await fetchPublicDeck('share/id');
  await submitPublicDeck({ title: '測試牌組' });
  await fetchAdminSubmissions({
    type: 'deck',
    status: 'approved',
    limit: 1,
    deckCursor: 'DECKCUR',
  });
  await fetchPublicDecks({ limit: 10 });

  assert(calls[0].path === '/api/decks?limit=10&cursor=CUR50R', 'public deck list query path');
  assert(
    calls[3].path.includes('deckCursor=DECKCUR'),
    'admin list sends its own deck cursor parameter',
  );
  assert(
    calls[4].path === '/api/decks?limit=10',
    'first page omits the cursor parameter entirely',
  );
  assert(calls[1].path === '/api/decks/share%2Fid', 'public deck detail encodes share id');
  assert(calls[2].options.method === 'POST', 'submit deck uses POST');
  assert(calls[2].options.headers['Content-Type'] === 'application/json', 'submit deck sends JSON content type');
  assert(calls[2].options.headers[CSRF_HEADER_NAME] === CSRF_HEADER_VALUE, 'api client sends CSRF header');
  assert(calls[2].options.credentials === 'same-origin', 'public mutating request uses same-origin credentials');
  assert(calls[3].options.credentials === 'include', 'admin request includes credentials');

  globalThis.fetch = async () => ({ ok: false, status: 429, text: async () => '{"error":"slow down"}' });
  try {
    await fetchPublicDecks();
    fail('failed API response should throw');
  } catch (error) {
    assert(error instanceof ShareWallApiError, 'failed API response throws ShareWallApiError');
    assert(error.status === 429 && error.message === 'slow down', 'API error preserves status and backend message');
  }

  if (previousFetch) globalThis.fetch = previousFetch;
  else delete globalThis.fetch;
}

assert(formatShareWallError(new ShareWallApiError('rate limited', 429)) === '請求過於頻繁，請稍後再試', 'format 429 share-wall error');
assert(formatShareWallError(new ShareWallApiError('', 403)) === '請求被拒絕', 'format 403 fallback');
assert(formatShareWallError(new ShareWallApiError('offline', 503)) === '服務暫時無法使用，請稍後再試', 'format 503 share-wall error');
assert(formatShareWallError(new Error('broken')) === 'broken', 'format generic Error message');
assert(formatShareWallError(null, 'fallback') === 'fallback', 'format unknown error fallback');

// admin 審核後的就地列表更新（取代整份 reload）
{
  const pendingItems = [
    { id: 1, status: 'pending' },
    { id: 2, status: 'pending' },
    { id: 3, status: 'pending' },
  ];

  const approved = applyStatusChangeToList(pendingItems, {
    id: 2,
    nextStatus: 'approved',
    statusFilter: 'pending',
  });
  assert(approved.removed === true, 'approving under a pending filter removes the item');
  assert(
    approved.items.map((item) => item.id).join(',') === '1,3',
    'remaining items keep their order after removal',
  );
  assert(pendingItems.length === 3, 'applyStatusChangeToList does not mutate its input');

  const underAll = applyStatusChangeToList(pendingItems, {
    id: 2,
    nextStatus: 'approved',
    statusFilter: 'all',
  });
  assert(underAll.removed === false, 'status filter "all" keeps the item in the list');
  assert(underAll.items.length === 3, 'status filter "all" preserves list length');
  assert(
    underAll.items.find((item) => item.id === 2)?.status === 'approved',
    'status filter "all" updates the item status in place',
  );
  assert(
    underAll.items.find((item) => item.id === 1)?.status === 'pending',
    'status filter "all" leaves other items untouched',
  );

  const missing = applyStatusChangeToList(pendingItems, {
    id: 999,
    nextStatus: 'approved',
    statusFilter: 'pending',
  });
  assert(missing.removed === false, 'unknown id reports nothing removed (offset must not shift)');
  assert(missing.items.length === 3, 'unknown id leaves the list unchanged');
}

// ── 牌組符號統計 ───────────────────────────────────────────────────────────
{
  const emptyDeck = { leader: [], rituals: [], main: [] };
  assertDeepEqual(collectDeckSymbolCounts(emptyDeck), [], 'empty deck has no symbol entries');
  assert(getTotalSymbolCount(emptyDeck) === 0, 'empty deck totals zero symbols');

  // 稻原的實際資料是 ['自然','自然','夜幕']——單張卡提供 2 個自然。
  // 效果的 (N*符號) 算的是符號總數，故重複必須累加，不能當成「含此符號的卡數」。
  // 教主／儀式／主牌組三個欄位都要計入：已確認教主、儀式、信徒、地點在場上
  // 都提供自身符號（魔法卡無符號）。
  const deck = {
    leader: [{ id: 'cro01', symbols: ['夜幕', '知識'] }],
    rituals: [{ id: 'cro02', symbols: ['凋零'] }],
    main: [
      { id: 'fox18', symbols: ['自然', '自然', '夜幕'] },
      { id: 'kit06', symbols: ['凋零', '凋零', '自然'] },
      { id: 'mag01', symbols: [] },
      { id: 'mag02' },
    ],
  };
  const entries = collectDeckSymbolCounts(deck);
  const bySymbol = Object.fromEntries(entries.map((e) => [e.symbol, e.count]));

  assert(bySymbol['自然'] === 3, 'duplicate symbols on one card are counted individually');
  assert(bySymbol['凋零'] === 3, 'symbols are summed across all deck sections');
  assert(bySymbol['夜幕'] === 2, 'leader and main symbols both counted');
  assert(bySymbol['知識'] === 1, 'leader-only symbol counted');
  assert(!('禁忌' in bySymbol), 'symbols with zero count are omitted');
  assert(getTotalSymbolCount(deck) === 9, 'total symbol count sums every entry');

  // 卡牌可能沒有 symbols 欄位（魔法卡）或為空陣列——不可拋錯
  assert(entries.every((e) => e.count > 0), 'no zero-count entries leak through');

  // 顯示順序須與篩選下拉一致，否則同一份資料在兩處排列不同
  const orderedSymbols = entries.map((e) => e.symbol);
  const expectedOrder = SYMBOL_ORDER.filter((s) => orderedSymbols.includes(s));
  assertDeepEqual(orderedSymbols, expectedOrder, 'entries follow the shared symbol order');

  // 資料新增了常數未涵蓋的符號時，必須仍然出現（接在最後），不可靜默丟棄
  const withUnknown = collectDeckSymbolCounts({
    leader: [],
    rituals: [],
    main: [{ id: 'x', symbols: ['未知符號', '夜幕'] }],
  });
  assert(
    withUnknown.some((e) => e.symbol === '未知符號' && e.count === 1),
    'symbols missing from the order list are still reported',
  );
  assert(
    withUnknown[withUnknown.length - 1].symbol === '未知符號',
    'unknown symbols are appended after the known ones',
  );
}

assert(formatApiDate(null) === '—', 'empty api date placeholder');
assert(formatApiDate('not a date') === 'not a date', 'invalid api date preserved');
assert(formatApiDate('2026-01-01 00:00:00').includes('2026'), 'sqlite datetime formats as local display string');

if (failed > 0) {
  console.error(`\n${failed} utility test(s) failed`);
  process.exit(1);
}

console.log('OK: utility tests passed');

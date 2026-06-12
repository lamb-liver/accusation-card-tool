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
import { getCardMetaCells, getCardStats } from '../src/utils/cardMeta.js';
import { formatApiDate } from '../src/utils/formatApiDate.js';
import { formatShareWallError } from '../src/utils/formatShareWallError.js';
import { ruleToApiPayload, apiRuleToDeckRule } from '../src/utils/shareWallRule.js';
import { factionIconPath } from '../src/constants/factionOrder.js';
import { parseHashRoute } from '../src/hooks/useHashRoute.js';

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
assertDeepEqual(parseHashRoute('#/tools'), { kind: 'tools', toolId: 'coin' }, 'tools route defaults to coin');
assertDeepEqual(parseHashRoute('#/tools/coin'), { kind: 'tools', toolId: 'coin' }, 'coin tool route');
assertDeepEqual(parseHashRoute('#/tools/dice'), { kind: 'tools', toolId: 'dice' }, 'dice tool route');
assertDeepEqual(parseHashRoute('#/tools/timer'), { kind: 'tools', toolId: 'timer' }, 'timer tool route');
assertDeepEqual(parseHashRoute('#/unknown'), { kind: 'home' }, 'unknown hash routes home');

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

  await fetchPublicDecks({ limit: 10, offset: 5 });
  await fetchPublicDeck('share/id');
  await submitPublicDeck({ title: '測試牌組' });
  await fetchAdminSubmissions({ type: 'deck', status: 'approved', limit: 1, offset: 2 });

  assert(calls[0].path === '/api/decks?limit=10&offset=5', 'public deck list query path');
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

assert(formatApiDate(null) === '—', 'empty api date placeholder');
assert(formatApiDate('not a date') === 'not a date', 'invalid api date preserved');
assert(formatApiDate('2026-01-01 00:00:00').includes('2026'), 'sqlite datetime formats as local display string');

if (failed > 0) {
  console.error(`\n${failed} utility test(s) failed`);
  process.exit(1);
}

console.log('OK: utility tests passed');

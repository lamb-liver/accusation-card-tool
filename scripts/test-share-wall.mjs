#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateApiDeckJson, validateApiRuleJson } from '../src/utils/shareWallShape.js';
import { mapPublicDeckRow } from '../functions/_shared/db.js';
import { cardIds, factions } from '../functions/_shared/cardManifest.generated.js';
import { validateDeckComposition } from '../functions/_shared/deckComposition.js';
import { collectDeckStructureViolations } from '../shared/deckCompositionCore.js';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE, MAX_BODY_BYTES } from '../functions/_shared/constants.js';
import { CSRF_HEADER_VALUE as generatedBackendCsrf } from '../functions/_shared/csrf.generated.js';
import { CSRF_HEADER_VALUE as generatedFrontendCsrf } from '../src/api/csrfHeader.generated.js';
import { checkCsrfHeader, normalizeOrigin } from '../functions/_shared/origin.js';
import { parseOffsetParam, readJsonBody, resolvePageQuery } from '../functions/_shared/request.js';
import {
  buildKeysetClause,
  decodeCursor,
  encodeCursor,
  nextCursorFrom,
} from '../functions/_shared/cursor.js';
import { verifyTurnstileToken } from '../functions/_shared/turnstile.js';
import { stripTurnstileToken } from '../functions/_shared/submissionBody.js';
import {
  createAdminToken,
  shouldSetSecureCookie,
  timingSafeEqual,
  verifyAdminToken,
} from '../functions/_shared/auth.js';
import { createResponder, jsonResponse, runDbQuery } from '../functions/_shared/response.js';
import { isUniqueConstraintError } from '../functions/_shared/shareId.js';
import { canTransition } from '../functions/_shared/statusMachine.js';
import {
  validateDeckJson,
  validateDeckSubmission,
  validateGuestbookSubmission,
  validateRuleJson,
} from '../functions/_shared/validation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const runIntegration = process.argv.includes('--integration');

let failed = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed += 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function withMutedConsole(method, callback) {
  const original = console[method];
  console[method] = () => {};
  try {
    return await callback();
  } finally {
    console[method] = original;
  }
}

function sampleDeckJson() {
  return {
    leader: ['cro01'],
    rituals: ['cro02'],
    main: ['cro05', 'cro06'],
  };
}

function sampleRuleJson(type = 'rule1') {
  if (type === 'rule1') {
    return { type: 'rule1', primary: '鴉教團', secondary: '' };
  }
  return { type: 'rule2', primary: '鴉教團', secondary: '白狐神社' };
}

// manifest 與 public/cards 一致
const index = JSON.parse(
  readFileSync(resolve(projectRoot, 'public/cards/index.json'), 'utf8'),
);
const shardIds = [];
for (const shard of index.shards) {
  const cards = JSON.parse(
    readFileSync(resolve(projectRoot, 'public', shard.path.replace(/^\//, '')), 'utf8'),
  );
  for (const card of cards) shardIds.push(card.id);
}
assert(cardIds.size === shardIds.length, 'manifest card count mismatch with shards');
for (const id of shardIds) {
  assert(cardIds.has(id), `manifest missing card id: ${id}`);
}
assert(factions.size >= 5, 'manifest should include multiple factions');

// validation
assert(
  validateDeckSubmission({
    title: '測試牌組',
    author_name: '作者',
    description: '',
    deck_json: sampleDeckJson(),
    rule_json: sampleRuleJson(),
  }) === null,
  'valid deck submission should pass',
);
assert(
  validateDeckSubmission({
    title: '',
    author_name: '作者',
    deck_json: sampleDeckJson(),
    rule_json: sampleRuleJson(),
  }) !== null,
  'empty title should fail',
);
assert(validateDeckJson({ leader: ['nope'], rituals: [], main: [] }) !== null, 'unknown card id');
assert(
  validateDeckJson({ leader: ['cro01'], rituals: ['cro01'], main: [] }) !== null,
  'duplicate card id',
);
assert(validateRuleJson(sampleRuleJson('rule1')) === null, 'valid rule1');
assert(validateRuleJson(sampleRuleJson('rule2')) === null, 'valid rule2');
assert(
  validateRuleJson({ type: 'rule1', primary: '鴉教團', secondary: '白狐神社' }) !== null,
  'rule1 secondary must be empty',
);
assert(
  validateRuleJson({ type: 'rule2', primary: '鴉教團', secondary: '鴉教團' }) !== null,
  'rule2 secondary must differ from primary',
);
assert(
  validateGuestbookSubmission({ author_name: '訪客', message: '你好' }) === null,
  'valid guestbook',
);

assert(
  validateDeckComposition(sampleDeckJson(), sampleRuleJson('rule1')) === null,
  'valid deck composition should pass',
);
assert(
  validateDeckComposition(
    { leader: ['cro01'], rituals: ['cro02'], main: ['fox05'] },
    sampleRuleJson('rule1'),
  ) !== null,
  'rule1 deck with foreign faction main card should fail',
);
assert(
  collectDeckStructureViolations(
    {
      leader: [{ id: 'cro01', name: '第十三夜', faction: '鴉教團', type: '教主' }],
      rituals: [],
      main: [{ id: 'fox05', name: '神巫', faction: '白狐神社', type: '信徒' }],
    },
    sampleRuleJson('rule1'),
  ).length > 0,
  'shared collectDeckStructureViolations should reject foreign faction',
);

assert(normalizeOrigin('http://localhost:5173/') === 'http://localhost:5173', 'normalize origin');
assert(
  checkCsrfHeader({ headers: { get: () => null } }, {}) !== null,
  'missing CSRF header should fail',
);
assert(
  checkCsrfHeader(
    { headers: { get: (key) => (key === CSRF_HEADER_NAME ? CSRF_HEADER_VALUE : null) } },
    {},
  ) === null,
  'valid CSRF header should pass',
);
assert(
  CSRF_HEADER_VALUE === generatedBackendCsrf,
  'constants.js must re-export generated backend CSRF value',
);
assert(
  generatedBackendCsrf === generatedFrontendCsrf,
  'generated frontend/backend CSRF header value must match',
);
assert(
  stripTurnstileToken({ author_name: 'a', message: 'hi', turnstile_token: 'tok' }).turnstile_token ===
    undefined,
  'stripTurnstileToken should remove turnstile_token',
);
assert(parseOffsetParam(new URL('http://test/?offset=5')) === 5, 'parse offset');
assert(parseOffsetParam(new URL('http://test/')) === 0, 'default offset zero');

{
  const raw = JSON.stringify({ message: '你'.repeat(11_000) });
  assert(raw.length < MAX_BODY_BYTES, 'multi-byte body fixture should be under char limit');
  assert(
    new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES,
    'multi-byte body fixture should exceed byte limit',
  );
  const result = await readJsonBody(
    new Request('http://test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
    }),
  );
  assert(result.error?.status === 413, 'readJsonBody should enforce byte length');
}

{
  const localSkip = await verifyTurnstileToken(undefined, {}, { headers: { get: () => null } });
  assert(localSkip === null, 'local env without Turnstile secret should skip verification');
  const prodFail = await withMutedConsole('warn', () =>
    verifyTurnstileToken(undefined, { ENVIRONMENT: 'production' }, {
      headers: { get: () => null },
    }),
  );
  assert(prodFail?.status === 500, 'production without Turnstile secret should return 500');
}

// status machine
assert(canTransition('pending', 'approved'), 'pending -> approved');
assert(canTransition('approved', 'hidden'), 'approved -> hidden');
assert(canTransition('hidden', 'approved'), 'hidden -> approved');
assert(!canTransition('deleted', 'approved'), 'deleted is terminal');
assert(!canTransition('pending', 'pending'), 'same status is invalid');

// admin token
const env = { ADMIN_SESSION_SECRET: 'test-secret-for-unit-tests' };
const token = await createAdminToken(env);
const session = await verifyAdminToken(token, env);
assert(session?.role === 'admin', 'admin token should verify');

// keyset 游標編解碼
{
  const roundTrip = decodeCursor(encodeCursor('2026-07-22 03:04:05', 42));
  assert(roundTrip?.sortValue === '2026-07-22 03:04:05', 'cursor round-trips sortValue');
  assert(roundTrip?.id === 42, 'cursor round-trips id');
  assert(
    !/[+/=]/.test(encodeCursor('2026-07-22 03:04:05', 42)),
    'cursor is base64url (safe in a query string without escaping)',
  );

  assert(decodeCursor('') === null, 'empty cursor rejected');
  assert(decodeCursor('not-base64!!') === null, 'malformed cursor rejected');
  assert(decodeCursor(btoa('{"v":1}')) === null, 'cursor missing fields rejected');
  assert(
    decodeCursor(btoa(JSON.stringify({ v: 99, s: 'x', i: 1 }))) === null,
    'cursor with unknown version rejected',
  );
  assert(
    decodeCursor(btoa(JSON.stringify({ v: 1, s: 'x', i: 0 }))) === null,
    'cursor with non-positive id rejected',
  );
  assert(
    decodeCursor(btoa(JSON.stringify({ v: 1, s: '', i: 1 }))) === null,
    'cursor with empty sortValue rejected',
  );

  // keyset 條件必須包含同時間戳的 tiebreaker，否則同秒的列會被整批跳過
  const keyset = buildKeysetClause('reviewed_at', { sortValue: 'T', id: 7 });
  assert(
    keyset.clause.includes('reviewed_at < ?') && keyset.clause.includes('reviewed_at = ?'),
    'keyset clause covers both the strictly-earlier and same-timestamp cases',
  );
  assert(
    keyset.bind.length === 3 && keyset.bind[2] === 7,
    'keyset binds sortValue twice then the tiebreaker id',
  );

  assert(nextCursorFrom(undefined, 'reviewed_at') === null, 'no row yields no cursor');
  assert(
    nextCursorFrom({ reviewed_at: null, id: 1 }, 'reviewed_at') === null,
    'row without a sort value yields no cursor',
  );
  assert(
    decodeCursor(nextCursorFrom({ reviewed_at: 'T1', id: 9 }, 'reviewed_at'))?.id === 9,
    'nextCursorFrom encodes the last row of the page',
  );
}

// 分頁參數解析：cursor 優先，offset 為舊前端的相容路徑
{
  const pageUrl = (qs) => new URL(`https://example.test/api/decks${qs}`);

  const firstPage = resolvePageQuery(pageUrl(''), 'reviewed_at');
  assert(firstPage.clause === '', 'no cursor and no offset means first page (no extra clause)');
  assert(firstPage.limitClause === 'LIMIT ? OFFSET ?', 'first page still binds an offset of 0');
  assert(firstPage.tailBind[0] === 0, 'default offset is 0');

  const cursored = resolvePageQuery(
    pageUrl(`?cursor=${encodeCursor('T', 5)}`),
    'reviewed_at',
  );
  assert(cursored.clause.includes('reviewed_at'), 'cursor produces a keyset clause');
  assert(cursored.limitClause === 'LIMIT ?', 'keyset paging does not use OFFSET');
  assert(cursored.tailBind.length === 0, 'keyset paging binds nothing after the limit');

  const legacy = resolvePageQuery(pageUrl('?offset=40'), 'reviewed_at');
  assert(legacy.clause === '', 'offset path adds no keyset clause');
  assert(legacy.tailBind[0] === 40, 'offset path still honours the legacy parameter');

  // 不可靜默當成第一頁，否則「載入更多」會無聲重複回傳第一頁
  assert(
    resolvePageQuery(pageUrl('?cursor=garbage'), 'reviewed_at').error !== undefined,
    'invalid cursor is an error, not a silent fallback to page one',
  );
  assert(
    resolvePageQuery(pageUrl('?offset=-1'), 'reviewed_at').error !== undefined,
    'negative offset is rejected',
  );

  // 兩者同時出現時以 cursor 為準（只有新前端會送 cursor）
  const both = resolvePageQuery(
    pageUrl(`?offset=40&cursor=${encodeCursor('T', 5)}`),
    'reviewed_at',
  );
  assert(both.limitClause === 'LIMIT ?', 'cursor wins when both parameters are present');
}

// 常數時間密碼比對
assert(await timingSafeEqual('correct-horse', 'correct-horse'), 'identical strings should match');
assert(!(await timingSafeEqual('correct-horse', 'correct-hors')), 'prefix should not match');
assert(!(await timingSafeEqual('correct-horse', '')), 'empty candidate should not match');
assert(!(await timingSafeEqual(undefined, 'x')), 'non-string candidate should not match');
assert(await timingSafeEqual('多位元組密碼', '多位元組密碼'), 'multibyte strings should match');

// requestId：日誌與回應標頭必須是同一個值
{
  const requestWithoutId = { headers: { get: () => null } };
  const { requestId, respond } = createResponder(requestWithoutId);
  const response = respond(jsonResponse({ ok: true }));
  assert(
    response.headers.get('X-Request-Id') === requestId,
    'createResponder should reuse one requestId for logs and response header',
  );

  const requestWithId = { headers: { get: (name) => (name === 'X-Request-Id' ? 'abcd1234' : null) } };
  assert(
    createResponder(requestWithId).requestId === 'abcd1234',
    'client-supplied X-Request-Id should be honoured',
  );
}

// D1 失敗要轉成結構化 500，而非裸 throw
{
  const ok = await runDbQuery('scope', 'req-1', async () => 'value');
  assert(ok.data === 'value' && !ok.error, 'runDbQuery should pass through success');

  const failure = await withMutedConsole('error', () =>
    runDbQuery('scope', 'req-1', async () => {
      throw new Error('D1 unavailable');
    }),
  );
  assert(failure.error?.status === 500, 'runDbQuery should convert a throw into a 500 response');
  assert(
    (await failure.error.json())?.error === 'Internal server error',
    'runDbQuery 500 should keep the { error } envelope',
  );
}

assert(validateApiDeckJson({ leader: ['a'], rituals: [], main: [] }) === null, 'valid api deck json');
assert(validateApiDeckJson({ leader: 'bad', rituals: [], main: [] }) !== null, 'invalid leader type');
assert(validateApiRuleJson({ type: 'rule1', primary: '鴉教團', secondary: '' }) === null, 'valid api rule');
assert(validateApiRuleJson({ type: 'nope', primary: 'x', secondary: '' }) !== null, 'invalid rule type');

assert(
  (await withMutedConsole('error', () =>
    mapPublicDeckRow({
      share_id: 'abc123',
      title: 't',
      author_name: 'a',
      description: '',
      deck_json: '{bad',
      rule_json: '{"type":"rule1","primary":"鴉教團","secondary":""}',
      reviewed_at: null,
      created_at: '2026-01-01 00:00:00',
    }),
  )) === null,
  'corrupt deck_json should return null from mapPublicDeckRow',
);
assert(
  mapPublicDeckRow({
    share_id: 'abc123',
    title: 't',
    author_name: 'a',
    description: '',
    deck_json: '{"leader":[],"rituals":[],"main":[]}',
    rule_json: '{"type":"rule1","primary":"鴉教團","secondary":""}',
    reviewed_at: null,
    created_at: '2026-01-01 00:00:00',
  })?.deck_json,
  'valid stored JSON should map successfully',
);
assert(!shouldSetSecureCookie({}), 'local env should not set Secure cookie');
assert(shouldSetSecureCookie({ ENVIRONMENT: 'production' }), 'production should set Secure cookie');

// share_id 碰撞重試耗盡應回 500（模擬與 decks.js 相同邏輯）
{
  let exhaustedStatus = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      throw new Error('UNIQUE constraint failed: deck_shares.share_id');
    } catch (insertError) {
      if (isUniqueConstraintError(insertError)) {
        if (attempt === 4) exhaustedStatus = 500;
        continue;
      }
      exhaustedStatus = 500;
      break;
    }
  }
  assert(exhaustedStatus === 500, 'share_id collision exhaustion should yield 500');
}

function parseDevVars(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    vars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return vars;
}

function serializeDevVars(vars) {
  return `${Object.entries(vars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')}\n`;
}

function restoreDevVars(devVarsPath, backup, hadDevVars) {
  if (hadDevVars) {
    writeFileSync(devVarsPath, backup, 'utf8');
    return;
  }
  if (existsSync(devVarsPath)) unlinkSync(devVarsPath);
}

async function requestJson(baseUrl, path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      // 必須用 CSRF_HEADER_NAME。曾經寫死成 'X-Requested-With'，後端讀的卻是
      // x-accusation-csrf，導致每個 mutating 請求都被 403 擋下、整套整合測試
      // 全紅——而「錯誤 CSRF header 應回 403」那條斷言反而因此假性通過。
      [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: response.status, data, headers: response.headers };
}

function installDevVarsCleanup(devVarsPath, backup, hadDevVars) {
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    restoreDevVars(devVarsPath, backup, hadDevVars);
  };
  process.once('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    cleanup();
    process.exit(143);
  });
  return cleanup;
}

async function runIntegrationTests() {
  const origin = 'http://localhost:5173';
  const port = 8791;
  const baseUrl = `http://127.0.0.1:${port}`;
  const devVarsPath = resolve(projectRoot, '.dev.vars');
  let devVarsBackup = '';
  let hadDevVars = false;
  if (existsSync(devVarsPath)) {
    devVarsBackup = readFileSync(devVarsPath, 'utf8');
    hadDevVars = true;
  }
  writeFileSync(
    devVarsPath,
    serializeDevVars({
      ...(hadDevVars ? parseDevVars(devVarsBackup) : {}),
      ADMIN_PASSWORD: 'test-admin-password',
      ADMIN_SESSION_SECRET: 'integration-test-secret',
      ALLOWED_ORIGINS: origin,
      RATE_LIMIT_DISABLED: 'true',
      ENVIRONMENT: 'development',
    }),
    'utf8',
  );
  const cleanupDevVars = installDevVarsCleanup(devVarsPath, devVarsBackup, hadDevVars);

  const child = spawn(
    'npx',
    ['wrangler', 'pages', 'dev', 'dist', '--local', '--port', String(port)],
    { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try {
      const probe = await fetch(`${baseUrl}/api/decks`);
      if (probe.status === 200) {
        ready = true;
        break;
      }
    } catch {
      // server still starting
    }
    await delay(500);
  }
  if (!ready) {
    child.kill('SIGTERM');
    fail('wrangler pages dev did not become ready');
    return;
  }

  try {
    const badOrigin = await requestJson(baseUrl, '/api/decks', {
      method: 'POST',
      headers: { Origin: 'http://evil.test' },
      body: {
        title: '惡意',
        author_name: 'x',
        deck_json: sampleDeckJson(),
        rule_json: sampleRuleJson(),
      },
    });
    assert(badOrigin.status === 403, 'mutating request with bad origin should be 403');

    const missingCsrf = await requestJson(baseUrl, '/api/decks', {
      method: 'POST',
      // 覆寫成正確的 header 名稱、錯誤的值，才真的測到 CSRF 值比對
      headers: { Origin: origin, [CSRF_HEADER_NAME]: 'wrong' },
      body: {
        title: '惡意',
        author_name: 'x',
        deck_json: sampleDeckJson(),
        rule_json: sampleRuleJson(),
      },
    });
    assert(missingCsrf.status === 403, 'mutating request with bad CSRF header should be 403');

    const deckRes = await requestJson(baseUrl, '/api/decks', {
      method: 'POST',
      headers: { Origin: origin },
      body: {
        title: '整合測試牌組',
        author_name: '測試者',
        description: 'phase1',
        deck_json: sampleDeckJson(),
        rule_json: sampleRuleJson(),
      },
    });
    assert(deckRes.status === 201, 'deck submit should return 201');
    assert(deckRes.data?.status === 'pending', 'deck submit should be pending');
    const shareId = deckRes.data?.share_id;
    assert(typeof shareId === 'string' && shareId.length >= 12, 'share_id should be returned');

    const hiddenDeck = await requestJson(baseUrl, `/api/decks/${shareId}`);
    assert(hiddenDeck.status === 404, 'pending deck should not be public');

    const msgRes = await requestJson(baseUrl, '/api/guestbook', {
      method: 'POST',
      headers: { Origin: origin },
      body: { author_name: '訪客', message: '整合測試留言' },
    });
    assert(msgRes.status === 201, 'guestbook submit should return 201');

    const publicDecks = await requestJson(baseUrl, '/api/decks');
    assert(publicDecks.status === 200, 'public deck list should work');
    assert(Array.isArray(publicDecks.data?.decks), 'public deck list envelope');
    assert(publicDecks.data.decks.length === 0, 'pending deck should not appear in public list');
    assert(publicDecks.data?.hasMore === false, 'public deck list should include hasMore');

    const adminList = await requestJson(baseUrl, '/api/admin/submissions');
    assert(adminList.status === 401, 'admin list without auth should be 401');

    const adminDeckNoAuth = await requestJson(baseUrl, '/api/admin/decks/1');
    assert(adminDeckNoAuth.status === 401, 'admin deck preview without auth should be 401');

    const login = await requestJson(baseUrl, '/api/admin/login', {
      method: 'POST',
      headers: { Origin: origin },
      body: { password: 'wrong' },
    });
    assert(login.status === 401, 'bad admin password should be 401');

    const loginOk = await requestJson(baseUrl, '/api/admin/login', {
      method: 'POST',
      headers: { Origin: origin },
      body: { password: 'test-admin-password' },
    });
    assert(loginOk.status === 200, 'admin login should succeed');
    const cookie = loginOk.headers.get('set-cookie');
    assert(cookie?.includes('admin_session='), 'admin login should set cookie');

    const pending = await requestJson(baseUrl, '/api/admin/submissions?type=all&status=pending', {
      headers: { Origin: origin, Cookie: cookie },
    });
    assert(pending.status === 200, 'admin pending list should work');
    assert(Array.isArray(pending.data?.decks), 'admin envelope decks');
    assert(Array.isArray(pending.data?.messages), 'admin envelope messages');
    assert(typeof pending.data?.decksHasMore === 'boolean', 'admin response should include decksHasMore');
    assert(typeof pending.data?.messagesHasMore === 'boolean', 'admin response should include messagesHasMore');
    const deckId = pending.data.decks[0]?.id;
    const messageId = pending.data.messages[0]?.id;
    assert(deckId, 'pending deck id should exist');
    assert(messageId, 'pending message id should exist');
    assert(!('deck_json' in (pending.data.decks[0] ?? {})), 'admin deck list must omit deck_json');
    assert(!('rule_json' in (pending.data.decks[0] ?? {})), 'admin deck list must omit rule_json');

    const deckPreview = await requestJson(baseUrl, `/api/admin/decks/${deckId}`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    assert(deckPreview.status === 200, 'admin deck preview should work');
    assert(deckPreview.data?.deck_json, 'admin deck preview should include deck_json');
    assert(deckPreview.data?.rule_json, 'admin deck preview should include rule_json');

    const deckOnly = await requestJson(
      baseUrl,
      '/api/admin/submissions?type=deck&status=pending',
      { headers: { Origin: origin, Cookie: cookie } },
    );
    assert(deckOnly.status === 200, 'admin type=deck filter should work');
    assert(deckOnly.data?.messages?.length === 0, 'type=deck should return empty messages');
    assert(deckOnly.data?.decks?.length >= 1, 'type=deck should return decks');

    const badStatus = await requestJson(baseUrl, `/api/admin/decks/${deckId}/status`, {
      method: 'PATCH',
      headers: { Origin: origin, Cookie: cookie },
      body: { status: 'approve' },
    });
    assert(badStatus.status === 400, 'misspelled status should return 400');

    const approveDeck = await requestJson(baseUrl, `/api/admin/decks/${deckId}/status`, {
      method: 'PATCH',
      headers: { Origin: origin, Cookie: cookie },
      body: { status: 'approved' },
    });
    assert(approveDeck.status === 200, 'approve deck should succeed');

    const publicDeck = await requestJson(baseUrl, `/api/decks/${shareId}`);
    assert(publicDeck.status === 200, 'approved deck should be public');
    assert(publicDeck.data?.deck_json, 'single deck should include deck_json');
    assert(publicDeck.data?.rule_json, 'single deck should include rule_json');

    const publicListAfterApprove = await requestJson(baseUrl, '/api/decks');
    const listItem = publicListAfterApprove.data?.decks?.[0];
    assert(listItem, 'approved deck should appear in public list');
    assert(!('deck_json' in listItem), 'public deck list must omit deck_json');
    assert(!('rule_json' in listItem), 'public deck list must omit rule_json');
    assert(publicListAfterApprove.data?.hasMore === false, 'hasMore should be false when <= limit');

    const firstReviewedAt = publicDeck.data?.reviewed_at;
    assert(firstReviewedAt, 'approved deck should have reviewed_at');

    const hideDeck = await requestJson(baseUrl, `/api/admin/decks/${deckId}/status`, {
      method: 'PATCH',
      headers: { Origin: origin, Cookie: cookie },
      body: { status: 'hidden' },
    });
    assert(hideDeck.status === 200, 'hide deck should succeed');
    const hiddenAgain = await requestJson(baseUrl, `/api/decks/${shareId}`);
    assert(hiddenAgain.status === 404, 'hidden deck should return 404');

    const reapproveDeck = await requestJson(baseUrl, `/api/admin/decks/${deckId}/status`, {
      method: 'PATCH',
      headers: { Origin: origin, Cookie: cookie },
      body: { status: 'approved' },
    });
    assert(reapproveDeck.status === 200, 'hidden -> approved should succeed');
    const adminReapproved = await requestJson(
      baseUrl,
      `/api/admin/submissions?type=deck&status=approved`,
      { headers: { Origin: origin, Cookie: cookie } },
    );
    const reapprovedRow = adminReapproved.data?.decks?.find((row) => row.id === deckId);
    assert(reapprovedRow?.reviewed_at, 'hidden -> approved should set reviewed_at');
    assert(
      reapprovedRow.reviewed_at >= firstReviewedAt,
      'reviewed_at should reflect latest status PATCH',
    );

    const approveMsg = await requestJson(baseUrl, `/api/admin/messages/${messageId}/status`, {
      method: 'PATCH',
      headers: { Origin: origin, Cookie: cookie },
      body: { status: 'approved' },
    });
    assert(approveMsg.status === 200, 'approve message should succeed');

    const publicMsgs = await requestJson(baseUrl, '/api/guestbook');
    assert(publicMsgs.status === 200, 'public guestbook list should work');
    assert(
      publicMsgs.data?.messages?.some((row) => row.message === '整合測試留言'),
      'approved message should appear in public list',
    );
    // 不斷言 hasMore === false：那等於假設本地 D1 是空的，跨回合累積資料後會誤紅。
    // 改成明確驗證兩種狀態——limit=1 且已有多筆時必為 true。
    assert(typeof publicMsgs.data?.hasMore === 'boolean', 'guestbook list should include hasMore');
    const cappedMsgs = await requestJson(baseUrl, '/api/guestbook?limit=1');
    assert(
      (cappedMsgs.data?.messages ?? []).length === 1,
      'guestbook list should honour the limit parameter',
    );
    assert(
      cappedMsgs.data?.hasMore === true,
      'hasMore should be true when more rows remain beyond the limit',
    );

    const deleteDeck = await requestJson(baseUrl, `/api/admin/decks/${deckId}/status`, {
      method: 'PATCH',
      headers: { Origin: origin, Cookie: cookie },
      body: { status: 'deleted' },
    });
    assert(deleteDeck.status === 200, 'delete deck should succeed');

    const reviveDeck = await requestJson(baseUrl, `/api/admin/decks/${deckId}/status`, {
      method: 'PATCH',
      headers: { Origin: origin, Cookie: cookie },
      body: { status: 'approved' },
    });
    assert(reviveDeck.status === 409, 'deleted deck cannot be revived');

    // ── keyset 分頁 ──────────────────────────────────────────────────────────
    // 連續核准會落在同一秒，reviewed_at 相同——正好驗證 id tiebreaker：
    // 若排序不是全序，邊界上的列會被跳過或重複。
    // 本地 D1 會跨測試回合累積資料。訊息內容須逐回合唯一，否則殘留的同名列
    // 會讓「無重複」斷言誤判；結束時再把本回合的資料標記為 deleted。
    const runTag = Date.now().toString(36);
    const seededIds = [];

    async function submitAndApproveMessage(text) {
      const posted = await requestJson(baseUrl, '/api/guestbook', {
        method: 'POST',
        headers: { Origin: origin },
        body: { author_name: '分頁測試', message: text },
      });
      assert(posted.status === 201, `seed message "${text}" should be created`);

      const pendingList = await requestJson(
        baseUrl,
        '/api/admin/submissions?type=guestbook&status=pending&limit=100',
        { headers: { Origin: origin, Cookie: cookie } },
      );
      const row = pendingList.data?.messages?.find((m) => m.message === text);
      assert(row, `seed message "${text}" should be pending`);
      seededIds.push(row.id);

      const approved = await requestJson(baseUrl, `/api/admin/messages/${row.id}/status`, {
        method: 'PATCH',
        headers: { Origin: origin, Cookie: cookie },
        body: { status: 'approved' },
      });
      assert(approved.status === 200, `seed message "${text}" should be approved`);
    }

    const seeded = [1, 2, 3, 4, 5].map((n) => `頁測${n}-${runTag}`);
    for (const text of seeded) {
      await submitAndApproveMessage(text);
    }

    // 逐頁走完，確認總數正確且無重複、無遺漏。
    // guard 需大於整個列表的頁數（含殘留資料），否則會提前中斷而誤判為「遺漏」。
    const walked = [];
    let walkCursor = null;
    for (let guard = 0; guard < 500; guard += 1) {
      const query = walkCursor
        ? `/api/guestbook?limit=2&cursor=${encodeURIComponent(walkCursor)}`
        : '/api/guestbook?limit=2';
      const page = await requestJson(baseUrl, query);
      assert(page.status === 200, 'keyset page should return 200');
      assert((page.data?.messages ?? []).length <= 2, 'page must not exceed the requested limit');
      walked.push(...(page.data?.messages ?? []).map((m) => m.message));
      if (!page.data?.hasMore) {
        assert(page.data?.nextCursor === null, 'last page should not carry a next cursor');
        break;
      }
      assert(typeof page.data?.nextCursor === 'string', 'non-final page must carry a next cursor');
      walkCursor = page.data.nextCursor;
    }

    const seededWalked = walked.filter((m) => seeded.includes(m));
    assert(
      seededWalked.length === new Set(seededWalked).size,
      'keyset paging must not repeat rows across pages',
    );
    assert(
      seeded.every((text) => seededWalked.includes(text)),
      'keyset paging must not skip rows across pages',
    );

    // 關鍵情境：翻頁途中插入新資料。OFFSET 會因前面多一筆而重複回傳上一頁
    // 的最後一列；keyset 以排序鍵定位，不受影響。
    const firstPage = await requestJson(baseUrl, '/api/guestbook?limit=2');
    assert(firstPage.data?.hasMore === true, 'seeded data should span more than one page');
    const firstPageMessages = (firstPage.data?.messages ?? []).map((m) => m.message);
    const cursorAfterFirstPage = firstPage.data.nextCursor;

    const jumpedText = `頁測插隊-${runTag}`;
    await submitAndApproveMessage(jumpedText);

    const secondPage = await requestJson(
      baseUrl,
      `/api/guestbook?limit=2&cursor=${encodeURIComponent(cursorAfterFirstPage)}`,
    );
    const secondPageMessages = (secondPage.data?.messages ?? []).map((m) => m.message);
    assert(
      !secondPageMessages.some((m) => firstPageMessages.includes(m)),
      'a row inserted mid-walk must not push page one rows into page two',
    );
    assert(
      !secondPageMessages.includes(jumpedText),
      'a row inserted after the cursor position must not appear on a later page',
    );

    // 清掉本回合的 seed，避免本地 D1 無限累積拖慢後續回合
    for (const id of seededIds) {
      await requestJson(baseUrl, `/api/admin/messages/${id}/status`, {
        method: 'PATCH',
        headers: { Origin: origin, Cookie: cookie },
        body: { status: 'deleted' },
      });
    }
  } finally {
    child.kill('SIGTERM');
    cleanupDevVars();
  }
}

if (runIntegration) {
  console.log('Running integration tests...');
  await runIntegrationTests();
}

if (failed === 0) {
  console.log(
    runIntegration
      ? 'OK: share-wall unit + integration tests passed'
      : 'OK: share-wall unit tests passed',
  );
} else {
  process.exit(1);
}

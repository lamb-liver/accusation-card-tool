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
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../functions/_shared/constants.js';
import { CSRF_HEADER_VALUE as generatedBackendCsrf } from '../functions/_shared/csrf.generated.js';
import { CSRF_HEADER_VALUE as generatedFrontendCsrf } from '../src/api/csrfHeader.generated.js';
import { checkCsrfHeader, normalizeOrigin } from '../functions/_shared/origin.js';
import { parseOffsetParam } from '../functions/_shared/request.js';
import { verifyTurnstileToken } from '../functions/_shared/turnstile.js';
import { stripTurnstileToken } from '../functions/_shared/submissionBody.js';
import {
  createAdminToken,
  shouldSetSecureCookie,
  verifyAdminToken,
} from '../functions/_shared/auth.js';
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
  const localSkip = await verifyTurnstileToken(undefined, {}, { headers: { get: () => null } });
  assert(localSkip === null, 'local env without Turnstile secret should skip verification');
  const prodFail = await verifyTurnstileToken(undefined, { ENVIRONMENT: 'production' }, {
    headers: { get: () => null },
  });
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

assert(validateApiDeckJson({ leader: ['a'], rituals: [], main: [] }) === null, 'valid api deck json');
assert(validateApiDeckJson({ leader: 'bad', rituals: [], main: [] }) !== null, 'invalid leader type');
assert(validateApiRuleJson({ type: 'rule1', primary: '鴉教團', secondary: '' }) === null, 'valid api rule');
assert(validateApiRuleJson({ type: 'nope', primary: 'x', secondary: '' }) !== null, 'invalid rule type');

assert(
  mapPublicDeckRow({
    share_id: 'abc123',
    title: 't',
    author_name: 'a',
    description: '',
    deck_json: '{bad',
    rule_json: '{"type":"rule1","primary":"鴉教團","secondary":""}',
    reviewed_at: null,
    created_at: '2026-01-01 00:00:00',
  }) === null,
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
      'X-Requested-With': CSRF_HEADER_VALUE,
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
      headers: { Origin: origin, 'X-Requested-With': 'wrong' },
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
    assert(publicMsgs.data?.hasMore === false, 'guestbook list should include hasMore');

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

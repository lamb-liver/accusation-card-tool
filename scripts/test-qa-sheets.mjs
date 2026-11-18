import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FACTION_ORDER } from '../src/constants/factionOrder.js';
import { SHEETS, NON_FACTION_CATEGORIES, assertFactionCoverage } from './lib/qa-sheets.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

assert.doesNotThrow(() => assertFactionCoverage(), '目前分頁清單應與教團清單一致');

const incomplete = SHEETS.filter((sheet) => sheet.label !== '疫病中心');
assert.throws(
  () => assertFactionCoverage({ sheets: incomplete }),
  (error) =>
    error instanceof Error &&
    error.message.includes('缺少教團分頁') &&
    error.message.includes('疫病中心'),
  '少一個教團分頁時應失敗',
);

assert.doesNotThrow(
  () => assertFactionCoverage({ sheets: SHEETS }),
  '恢復完整分頁清單後應通過',
);

assert.throws(
  () => assertFactionCoverage({
    sheets: [...SHEETS, { label: '不存在的教團', url: 'https://example.com' }],
  }),
  (error) =>
    error instanceof Error &&
    error.message.includes('未知分類') &&
    error.message.includes('不存在的教團'),
  '未知分類應失敗',
);

assert.ok(NON_FACTION_CATEGORIES.has('通用規則'), '通用規則不需對應教團');
for (const faction of FACTION_ORDER) {
  assert.ok(
    SHEETS.some((sheet) => sheet.label === faction),
    `SHEETS 應包含教團「${faction}」`,
  );
}

const check = spawnSync(process.execPath, [resolve(projectRoot, 'scripts/check-qa-sheets.mjs')], {
  cwd: projectRoot,
  encoding: 'utf8',
});
assert.equal(check.status, 0, `check-qa-sheets 對目前設定應通過\n${check.stdout}\n${check.stderr}`);
assert.match(check.stdout, /check-qa-sheets: ok/);

console.log('test-qa-sheets: ok');

#!/usr/bin/env node
/**
 * QA 自動同步的內容流失防護。
 *
 * 免人工推送後沒有人會在合併前看一眼 diff，因此在推送前擋下「看起來像
 * 資料出問題」的同步結果：試算表分頁被清空／取消發布時，CSV 仍可能回傳
 * 200 但無資料列，sync-qa 會以佔位符取代真實 QA 並直接上線。
 *
 * 比對 git HEAD 版本與剛同步的結果，發現下列情形即以非 0 結束：
 *  - 某分類原本有真實題目，現在只剩佔位符
 *  - 分類數量減少
 *  - 題目總數掉超過 THRESHOLD
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const QA_PATH = 'src/data/qaData.js';
const PLACEHOLDER_Q = '目前尚無特定 QA';
/** 題數允許的最大跌幅（試算表正常編修可能小幅減少，大跌代表出事） */
const MAX_DROP_RATIO = 0.3;

function parseQaSource(source) {
  const match = source.match(/export const qaData = ([\s\S]*);\s*$/);
  if (!match) throw new Error(`無法從 ${QA_PATH} 解析 qaData`);
  return JSON.parse(match[1]);
}

function isPlaceholderOnly(category) {
  return category.questions.every((item) => item.q === PLACEHOLDER_Q);
}

function countQuestions(data) {
  return data.reduce((n, c) => n + (isPlaceholderOnly(c) ? 0 : c.questions.length), 0);
}

const next = parseQaSource(readFileSync(resolve(projectRoot, QA_PATH), 'utf-8'));

let previous;
try {
  previous = parseQaSource(
    execFileSync('git', ['show', `HEAD:${QA_PATH}`], { cwd: projectRoot, encoding: 'utf-8' }),
  );
} catch {
  console.log('check-qa-sync-safety: 找不到 HEAD 版本可比對，略過（視為首次建立）');
  process.exit(0);
}

const failures = [];

const previousByCategory = new Map(previous.map((c) => [c.category, c]));
for (const category of next) {
  const before = previousByCategory.get(category.category);
  if (!before) continue;
  if (!isPlaceholderOnly(before) && isPlaceholderOnly(category)) {
    failures.push(
      `分類「${category.category}」原有 ${before.questions.length} 題，同步後只剩佔位符 — 分頁可能被清空或取消發布`,
    );
  }
}

for (const category of previous) {
  if (!next.some((c) => c.category === category.category)) {
    failures.push(`分類「${category.category}」在同步後消失`);
  }
}

const beforeTotal = countQuestions(previous);
const afterTotal = countQuestions(next);
if (beforeTotal > 0 && afterTotal < beforeTotal * (1 - MAX_DROP_RATIO)) {
  failures.push(
    `題目總數由 ${beforeTotal} 掉到 ${afterTotal}（跌幅超過 ${MAX_DROP_RATIO * 100}%）`,
  );
}

console.log(`check-qa-sync-safety: ${previous.length} → ${next.length} 分類，${beforeTotal} → ${afterTotal} 題`);

if (failures.length > 0) {
  console.error('\n偵測到疑似資料異常，已中止自動推送：');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\n請確認 Google 試算表各分頁仍正常發布；確定無誤可手動執行 npm run sync:qa 後提交。');
  process.exit(1);
}

console.log('check-qa-sync-safety: ok');

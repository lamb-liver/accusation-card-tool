import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { formatQaModule, parseQaModule } from './lib/qa-module.mjs';
import { QA_PLACEHOLDER, isPlaceholderOnlyCategory } from '../src/constants/qaPlaceholder.js';
import { FACTION_ORDER } from '../src/constants/factionOrder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SHEETS = [
  { label: '通用規則', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=1169306065&single=true&output=csv' },
  { label: '白狐神社', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=1973167497&single=true&output=csv' },
  { label: '鴉教團', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=1253175233&single=true&output=csv' },
  { label: '瘋人院', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=332236121&single=true&output=csv' },
  { label: '門教團', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=2076037145&single=true&output=csv' },
  { label: '逐光者', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=719906907&single=true&output=csv' },
  { label: '禁忌廚房', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=1316542157&single=true&output=csv' },
  { label: '放逐者', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=333010439&single=true&output=csv' },
];

const OUTPUT_PATH = resolve(__dirname, '../src/data/qaData.js');
const PLACEHOLDER = QA_PLACEHOLDER;
/** 非教團的 QA 專屬分類，不需對應 FACTION_ORDER */
const NON_FACTION_CATEGORIES = new Set(['通用規則']);

/** 新增教團時若忘了建 QA 分頁，卡片彈窗的「查看此教團常見問題」會靜默消失 */
function assertFactionCoverage() {
  const labels = new Set(SHEETS.map((sheet) => sheet.label));
  const missing = FACTION_ORDER.filter((faction) => !labels.has(faction));
  if (missing.length > 0) {
    throw new Error(
      `SHEETS 缺少教團分頁：${missing.join('、')}。新增教團時需一併加入 QA 分頁設定`,
    );
  }
  const unknown = SHEETS.map((s) => s.label).filter(
    (label) => !FACTION_ORDER.includes(label) && !NON_FACTION_CATEGORIES.has(label),
  );
  if (unknown.length > 0) {
    throw new Error(`SHEETS 含未知分類：${unknown.join('、')}`);
  }
}

async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  // strip UTF-8 BOM
  const input = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i], next = input[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ''; }
      else if (ch === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = ''; }
      else if (ch === '\r') { /* skip */ }
      else { cell += ch; }
    }
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

function rowsToQuestions(rows) {
  return rows
    .map(row => ({ q: row[1]?.trim(), a: row[2]?.trim() }))
    .filter(({ q, a }) => q && a);
}

/**
 * 讀取現有檔案中的 qaData（僅比對內容，忽略時間戳註解）。
 * @returns {unknown[] | null} 解析失敗或檔案不存在時回傳 null
 */
function readExistingQaData() {
  try {
    return parseQaModule(readFileSync(OUTPUT_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * 拒絕以佔位符覆蓋既有的真實 QA。防護放在寫入端而非只在 CI 事後檢查，
 * 本機執行 npm run sync:qa 也同樣受保護。
 * @param {unknown[] | null} previous
 * @param {{ category: string, questions: { q: string }[] }[]} next
 */
function assertNoContentLoss(previous, next) {
  if (!Array.isArray(previous)) return;
  const previousByCategory = new Map(previous.map((c) => [c.category, c]));
  const lost = next
    .filter((category) => {
      const before = previousByCategory.get(category.category);
      return before && !isPlaceholderOnlyCategory(before) && isPlaceholderOnlyCategory(category);
    })
    .map((category) => category.category);

  if (lost.length > 0) {
    throw new Error(
      `分類「${lost.join('、')}」原有真實 QA，同步後只剩佔位符——` +
        '請確認 Google 試算表該分頁仍正常發布。未寫入任何變更。',
    );
  }
}

async function main() {
  console.log('🔄 開始同步 QA 資料...\n');
  assertFactionCoverage();
  const qaData = [];

  for (const sheet of SHEETS) {
    process.stdout.write(`  ⬇️  ${sheet.label}... `);
    if (!sheet.url) {
      qaData.push({ category: sheet.label, questions: [PLACEHOLDER] });
      console.log('⏳ 尚未設定分頁 URL，使用佔位符（建立分頁後填入 gid）');
      continue;
    }
    const text = await fetchCSV(sheet.url);
    const questions = rowsToQuestions(parseCSV(text));
    qaData.push({
      category: sheet.label,
      questions: questions.length ? questions : [PLACEHOLDER],
    });
    console.log(questions.length ? `✅ ${questions.length} 題` : '空白，使用佔位符');
  }

  const total = qaData.reduce((n, c) => n + c.questions.length, 0);
  const previous = readExistingQaData();

  // 內容未變就不重寫（含時間戳）：否則每週排程都會產生只有時間戳差異的 PR，
  // 真正有新 QA 時反而被雜訊淹沒
  if (JSON.stringify(previous) === JSON.stringify(qaData)) {
    console.log(`\n✅ QA 內容無變化（${qaData.length} 分類，${total} 題），未更新檔案`);
    return;
  }

  assertNoContentLoss(previous, qaData);
  writeFileSync(OUTPUT_PATH, formatQaModule(qaData), 'utf-8');
  console.log(`\n✅ 已寫入 ${OUTPUT_PATH}，共 ${qaData.length} 分類，${total} 題`);
}

main().catch((error) => {
  console.error('❌ QA 同步失敗:', error);
  process.exit(1);
});

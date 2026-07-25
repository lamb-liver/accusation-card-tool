#!/usr/bin/env node
/**
 * 產生「展示用襯線字體（明體）」的最小子集 woff2。
 *
 * 為何要子集化：Noto Serif TC 全字集 woff2 約數 MB，直接載入會嚴重拖慢首屏；
 * 本工具的展示字體只用於品牌題字、區段標題與卡牌名稱，實際會出現的字元有限。
 * 這裡從 `public/cards.json`（卡名／教團）＋靜態 UI 文案蒐集字元，只向 Google Fonts
 * 取回「僅含這些字」的子集，下載後自我托管（維持 PWA 離線、無第三方執行期依賴）。
 *
 * 版權：Noto Serif TC 採 SIL OFL 1.1，允許子集化、修改與再散布，僅需隨附授權；
 * 產物與 `public/fonts/OFL.txt` 一併 commit。字體 Reserved Font Name 為 "Source"，
 * 使用 "Noto Serif TC" 名稱不衝突。
 *
 * 何時重跑：新增卡牌或改動下方 STATIC_TEXT 後，執行 `npm run fonts:display`，
 * 並將更新後的 woff2 一併 commit。缺字時展示字體會逐字回退到堆疊中的下一個字體，
 * 不會破版，只是該字改以備援字體呈現。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readJson } from './lib/public-assets.mjs';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = resolve(PROJECT_ROOT, 'public/fonts/NotoSerifTC-display-subset.woff2');
const FONT_FAMILY = 'Noto+Serif+TC';
const FONT_WEIGHT = 700;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 展示字體實際套用處會出現的靜態 UI 文案。缺字只會逐字回退，故此處求「涵蓋常見標題」即可。
const STATIC_TEXT = [
  '控訴查卡組牌交流計時', // 品牌題字＋模式列
  '找到張符合條件的卡片',
  '我的牌組可選卡池構築規則',
  '常見問題規則一二主教團中立放逐者',
  '載入卡牌資料中',
  '牌組超過上限主牌組',
  '隱藏已選隱藏圖片共卡牌在列表內拖動瀏覽',
  '請選擇主要教團套用規則並過濾卡池清空重置',
  '白狐神社鴉教團瘋人院門教團逐光者禁忌廚房',
  '教主儀式信徒魔法地點',
  '夜幕凋零野性自然知識煉金醫藥禁忌灰燼',
  '效果符號種類聲量守護災厄星塵地點類型取得方式',
  '0123456789',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  '（）()/-—－＆&：:，,。.、！？「」',
].join('');

function collectGlyphs() {
  const cards = readJson(PROJECT_ROOT, 'public/cards.json') || [];
  const set = new Set(STATIC_TEXT);
  for (const card of cards) {
    for (const ch of String(card?.name ?? '')) set.add(ch);
    for (const ch of String(card?.faction ?? '')) set.add(ch);
  }
  set.delete(' ');
  set.delete('\n');
  return [...set].sort().join('');
}

async function main() {
  const text = collectGlyphs();
  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${FONT_FAMILY}:wght@${FONT_WEIGHT}` +
    `&display=swap&text=${encodeURIComponent(text)}`;

  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
  if (!cssRes.ok) throw new Error(`Google Fonts CSS 取得失敗：HTTP ${cssRes.status}`);
  const css = await cssRes.text();
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/);
  if (!match) throw new Error('無法從回應中解析 woff2 URL（Google Fonts 格式可能變動）');

  const fontRes = await fetch(match[1], { headers: { 'User-Agent': UA } });
  if (!fontRes.ok) throw new Error(`字體下載失敗：HTTP ${fontRes.status}`);
  const buf = Buffer.from(await fontRes.arrayBuffer());
  if (buf.subarray(0, 4).toString('ascii') !== 'wOF2') {
    throw new Error('下載內容不是有效的 woff2');
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, buf);
  console.log(
    `✓ 展示字體子集已產生：${text.length} 字元 → ${(buf.length / 1024).toFixed(1)} KB\n` +
      `  ${OUT_PATH.replace(`${PROJECT_ROOT}/`, '')}`,
  );
}

main().catch((error) => {
  console.error(`✗ 產生展示字體失敗：${error.message}`);
  process.exitCode = 1;
});

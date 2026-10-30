#!/usr/bin/env node
/**
 * 產生「展示用襯線字體（明體）」的最小子集 woff2。
 *
 * 為何要子集化：Noto Serif TC 全字集 woff2 約數 MB，直接載入會嚴重拖慢首屏；
 * 本工具的展示字體只用於品牌題字、區段標題與卡牌名稱，實際會出現的字元有限。
 * 這裡由 scripts/lib/display-glyphs.mjs 自動蒐集字元（卡名／教團／QA 分類／帶 font-display 的 JSX 文字／SEO 標題），只向 Google Fonts
 * 取回「僅含這些字」的子集，下載後自我托管（維持 PWA 離線、無第三方執行期依賴）。
 *
 * 版權：Noto Serif TC 採 SIL OFL 1.1，允許子集化、修改與再散布，僅需隨附授權；
 * 產物與 `public/fonts/OFL.txt` 一併 commit。字體 Reserved Font Name 為 "Source"，
 * 使用 "Noto Serif TC" 名稱不衝突。
 *
 * 何時重跑：新增卡牌、QA 分類或展示字體標題後（validate:repo 的 check:display-glyphs 會擋下缺字），執行 `npm run fonts:display`，
 * 並將更新後的 woff2 一併 commit。缺字時展示字體會逐字回退到堆疊中的下一個字體，
 * 不會破版，只是該字改以備援字體呈現。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDisplayGlyphs, GLYPH_MANIFEST_PATH } from './lib/display-glyphs.mjs';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = resolve(PROJECT_ROOT, 'public/fonts/NotoSerifTC-display-subset.woff2');
const FONT_FAMILY = 'Noto+Serif+TC';
const FONT_WEIGHT = 700;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function collectGlyphs() {
  return collectDisplayGlyphs(PROJECT_ROOT);
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
  writeFileSync(resolve(PROJECT_ROOT, GLYPH_MANIFEST_PATH), `${text}\n`);
  console.log(
    `✓ 展示字體子集已產生：${text.length} 字元 → ${(buf.length / 1024).toFixed(1)} KB\n` +
      `  ${OUT_PATH.replace(`${PROJECT_ROOT}/`, '')}`,
  );
}

main().catch((error) => {
  console.error(`✗ 產生展示字體失敗：${error.message}`);
  process.exitCode = 1;
});

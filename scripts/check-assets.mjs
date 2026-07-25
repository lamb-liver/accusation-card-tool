#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkRequiredFiles,
  collectRequiredPublicAssets,
} from './lib/public-assets.mjs';
import { getCardImageAvifSrc } from '../src/utils/cardAlternateArt.js';
import { LCP_CARD_ID, LCP_IMAGE_WIDTH } from '../src/utils/galleryLayout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const { required, failures, cards } = collectRequiredPublicAssets(projectRoot);
failures.push(...checkRequiredFiles(projectRoot, required));

/** index.html 的 preload 為硬編碼；此檢查確保與資料及 LCP 常數同步 */
function checkIndexHtmlPreloads() {
  const html = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
  if (!html.includes('href="/cards.json"')) {
    failures.push('index.html 缺少卡牌目錄 preload：/cards.json');
  }
  const lcpPath = `/${getCardImageAvifSrc(LCP_CARD_ID, 'main', LCP_IMAGE_WIDTH)}`;
  if (!html.includes(lcpPath)) {
    failures.push(
      `index.html 缺少 LCP 圖片 preload：${lcpPath}（LCP_CARD_ID/LCP_IMAGE_WIDTH 變更後需同步 index.html）`,
    );
  }
}
checkIndexHtmlPreloads();

console.log('check-assets: scanned assets');
console.log(`  cards: ${cards.length}`);
console.log(`  required files: ${required.size}`);

if (failures.length > 0) {
  console.error('\nFailures:');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(`\ncheck-assets: failed (${failures.length} issue(s))`);
  process.exit(1);
}

console.log('\ncheck-assets: ok');

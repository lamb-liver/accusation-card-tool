#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkRequiredFiles,
  collectRequiredPublicAssets,
  expectedPrecompressedCardShardPaths,
} from './lib/public-assets.mjs';
import { getCardImageAvifSrc } from '../src/utils/cardAlternateArt.js';
import { LCP_CARD_ID, LCP_IMAGE_WIDTH } from '../src/utils/galleryLayout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const strictPrecompressed = process.argv.includes('--strict-precompressed');

const { required, failures, cards } = collectRequiredPublicAssets(projectRoot);
failures.push(...checkRequiredFiles(projectRoot, required));

/** index.html 的 LCP preload 為硬編碼；此檢查確保與 galleryLayout 常數、第一分片同步 */
function checkIndexHtmlPreloads() {
  const html = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
  const lcpPath = `/${getCardImageAvifSrc(LCP_CARD_ID, 'main', LCP_IMAGE_WIDTH)}`;
  if (!html.includes(lcpPath)) {
    failures.push(
      `index.html 缺少 LCP 圖片 preload：${lcpPath}（LCP_CARD_ID/LCP_IMAGE_WIDTH 變更後需同步 index.html）`,
    );
  }
  const index = JSON.parse(
    readFileSync(resolve(projectRoot, 'public/cards/index.json'), 'utf8'),
  );
  const firstShardPath = index.shards?.[0]?.path;
  if (firstShardPath && !html.includes(firstShardPath)) {
    failures.push(
      `index.html 缺少第一分片 preload：${firstShardPath}（分片順序變更後需同步 index.html）`,
    );
  }
}
checkIndexHtmlPreloads();

if (strictPrecompressed) {
  for (const path of expectedPrecompressedCardShardPaths(required)) {
    failures.push(...checkRequiredFiles(projectRoot, new Map([[path, new Set(['precompressed card shard'])]])));
  }
}

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

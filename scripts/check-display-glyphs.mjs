#!/usr/bin/env node
/** 檢查展示字體子集是否涵蓋所有用到展示字體的字元；缺字時請執行 `npm run fonts:display`。 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectDisplayGlyphs, GLYPH_MANIFEST_PATH, readGlyphManifest } from './lib/display-glyphs.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = readGlyphManifest(root);
if (manifest == null) {
  console.error(`✗ 找不到 ${GLYPH_MANIFEST_PATH}，請執行 npm run fonts:display`);
  process.exit(1);
}
const have = new Set(manifest);
const missing = [...collectDisplayGlyphs(root)].filter((ch) => !have.has(ch));
if (missing.length) {
  console.error(`✗ 展示字體子集缺 ${missing.length} 字：${missing.join('')}\n  請執行 npm run fonts:display 並 commit 字體檔`);
  process.exit(1);
}
console.log(`✓ 展示字體子集涵蓋全部 ${have.size} 字`);

/**
 * 蒐集「展示字體（font-display）」實際會顯示的所有字元。
 * build-display-font.mjs 用它產生子集；check-display-glyphs.mjs 用它檢查子集有沒有缺字。
 *
 * 來源（新增卡牌或標題時不必手動維護字表）：
 * 1. public/cards.json 的卡名、教團
 * 2. src/data/qaData.js 的 QA 分類名（QA 分類標題用展示字體）
 * 3. src/**\/*.jsx 中 className 含 font-display／app-brand-title 的元素內文字
 * 4. scripts/generate-seo-pages.mjs 的 <h1>／<h2> 靜態文字
 * 5. 少量通用字元（數字、括號、標點），供動態計數等使用
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const GLYPH_MANIFEST_PATH = 'public/fonts/NotoSerifTC-display-subset.glyphs.txt';

const BASE_TEXT = '0123456789（）()/-—：:，,。.、！？「」《》';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.jsx')) out.push(p);
  }
  return out;
}

/** 擷取 JSX 中帶展示字體 class 的元素內容（到對應的結束標籤），只取非 JS 表達式的文字。 */
function jsxDisplayText(source) {
  let text = '';
  const re = /<([a-zA-Z][\w.]*)\b[^>]*className=(?:"[^"]*|\{`[^`]*)\b(?:font-display|app-brand-title)\b[^>]*>/g;
  for (const m of source.matchAll(re)) {
    const start = m.index + m[0].length;
    const end = source.indexOf(`</${m[1]}>`, start);
    if (end < 0) continue;
    // 去掉 {…} 表達式（動態值如卡名另由 cards.json 涵蓋），但保留其中的字串常值
    const inner = source.slice(start, end);
    text += inner.replace(/\{[^{}]*\}/g, (expr) => (expr.match(/(['"`])([^'"`]*)\1/g) || []).join(''));
  }
  // 屬性裡的 class 字串本身含 ASCII，無妨；只保留非空白字元
  return text;
}

export function collectDisplayGlyphs(projectRoot) {
  const set = new Set(BASE_TEXT);
  const add = (s) => { for (const ch of String(s ?? '')) set.add(ch); };

  const cards = JSON.parse(readFileSync(resolve(projectRoot, 'public/cards.json'), 'utf8'));
  for (const card of cards) { add(card?.name); add(card?.faction); }

  const qa = readFileSync(resolve(projectRoot, 'src/data/qaData.js'), 'utf8');
  for (const m of qa.matchAll(/category["']?\s*:\s*(['"])([^'"]+)\1/g)) add(m[2]);

  for (const file of walk(resolve(projectRoot, 'src'))) add(jsxDisplayText(readFileSync(file, 'utf8')));

  const seo = readFileSync(resolve(projectRoot, 'scripts/generate-seo-pages.mjs'), 'utf8');
  for (const m of seo.matchAll(/<h[12]>([^<$]+)<\/h[12]>/g)) add(m[1]);

  // 只保留非 ASCII 字元＋BASE_TEXT＋英數字（ASCII 標籤／class 名不進子集，英數由 BASE/大寫字母補）
  const out = [...set].filter((ch) => !/\s/.test(ch) && (ch.charCodeAt(0) > 0x7f || /[0-9A-Z()/:,.-]/.test(ch)));
  return out.sort().join('');
}

export function readGlyphManifest(projectRoot) {
  try { return readFileSync(resolve(projectRoot, GLYPH_MANIFEST_PATH), 'utf8').trim(); } catch { return null; }
}

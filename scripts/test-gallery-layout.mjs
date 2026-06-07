import {
  CARD_BODY_HEIGHT_MOBILE,
  getCardRowHeight,
} from '../src/utils/galleryLayout.js';

let failed = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed += 1;
}

/** 與 getCardRowHeight 內部公式對齊的最小卡面高度 */
function minCardContentHeight(poolWidth, cols) {
  const gap = poolWidth < 640 ? 4 : 16;
  const columnWidth = poolWidth / cols;
  const horizontalPad = poolWidth < 640 ? 0 : gap;
  const contentWidth = Math.max(columnWidth - horizontalPad, 80);
  const imageHeight = contentWidth * (4 / 3);
  const bodyHeight = poolWidth < 640 ? CARD_BODY_HEIGHT_MOBILE : 200;
  const actionHeight = poolWidth < 640 ? 36 : 40;
  return imageHeight + bodyHeight + actionHeight;
}

for (const poolWidth of [320, 400, 620, 900, 1200]) {
  for (const cols of [2, 3, 4]) {
    const rowHeight = getCardRowHeight(poolWidth, cols);
    const minHeight = minCardContentHeight(poolWidth, cols);
    if (rowHeight < minHeight) {
      fail(
        `rowHeight ${rowHeight} < min ${Math.ceil(minHeight)} at width=${poolWidth} cols=${cols}`,
      );
    }
  }
}

// 欄寬應隨池寬放大（避免用錯 container 寬度導致列高過小）
const narrow = getCardRowHeight(400, 3);
const wide = getCardRowHeight(900, 3);
if (wide <= narrow) {
  fail(`wider pool should yield taller rows: narrow=${narrow} wide=${wide}`);
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}

console.log('test-gallery-layout: ok');

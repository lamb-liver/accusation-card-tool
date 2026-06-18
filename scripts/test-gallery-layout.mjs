import {
  CARD_ROW_HEIGHT,
  estimateGalleryMinHeight,
} from '../src/utils/galleryLayout.js';

let failed = 0;

function expectEqual(actual, expected, message) {
  if (actual === expected) return;
  console.error(`FAIL: ${message}: expected ${expected}, got ${actual}`);
  failed += 1;
}

expectEqual(estimateGalleryMinHeight(0, 6), 0, 'empty gallery');
expectEqual(estimateGalleryMinHeight(24, 6), 4 * CARD_ROW_HEIGHT, 'default page rows');
expectEqual(estimateGalleryMinHeight(7, 3, 100), 300, 'custom row height');

if (failed > 0) process.exit(1);

console.log('test-gallery-layout: ok');

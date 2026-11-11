import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * 卡牌頁分享圖：把卡圖置中放在 1200×630 深色底上，輸出 JPEG。
 * 版面比照站台的 og-share.jpg。輸出到 dist/og/card/，不進 repo，也不進 SW 預快取。
 */
export const CARD_OG_WIDTH = 1200;
export const CARD_OG_HEIGHT = 630;
export const CARD_OG_DIR = 'og/card';
const CARD_HEIGHT = 560;
const BACKGROUND = { r: 41, g: 42, b: 43 };

export function cardOgPath(cardId) {
  return `/${CARD_OG_DIR}/${encodeURIComponent(cardId)}.jpg`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<Set<string>>} 成功產生分享圖的卡牌 id；找不到卡圖的卡會略過（沿用全站分享圖）
 */
export async function generateCardOgImages({ cards, publicRoot, outputRoot, concurrency = 8 }) {
  const { default: sharp } = await import('sharp');
  const outDir = resolve(outputRoot, CARD_OG_DIR);
  await mkdir(outDir, { recursive: true });
  const generated = new Set();
  const queue = [...cards];

  async function worker() {
    while (queue.length > 0) {
      const card = queue.shift();
      const source = resolve(publicRoot, 'images', `${card.id}.webp`);
      if (!(await exists(source))) continue;
      const art = await sharp(source).resize({ height: CARD_HEIGHT }).toBuffer();
      await sharp({
        create: { width: CARD_OG_WIDTH, height: CARD_OG_HEIGHT, channels: 3, background: BACKGROUND },
      })
        .composite([{ input: art, gravity: 'center' }])
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(resolve(outDir, `${card.id}.jpg`));
      generated.add(card.id);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return generated;
}

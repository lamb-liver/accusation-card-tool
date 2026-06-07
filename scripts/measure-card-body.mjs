/**
 * 量測組牌池 compact 卡面資訊區實際高度（需 dev/preview）。
 *   npm run build && npm run preview &
 *   node scripts/measure-card-body.mjs
 */
import { chromium } from 'playwright';

const POOL_WIDTH = 390;

async function resolveBaseUrl() {
  if (process.env.DECK_LAYOUT_BASE_URL) return process.env.DECK_LAYOUT_BASE_URL;
  for (const url of ['http://localhost:4173', 'http://localhost:5173']) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return url;
    } catch {
      /* next */
    }
  }
  throw new Error('Start preview or dev server first');
}

async function run() {
  const baseUrl = await resolveBaseUrl();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: POOL_WIDTH, height: 844 } });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '組牌模式' }).click();
  await page.getByRole('heading', { name: '可選卡牌池' }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);

  const allRows = new Map();
  const grid = page.locator('.card-gallery-grid');
  const maxScroll = await grid.evaluate((el) => el.scrollHeight - el.clientHeight);
  const step = Math.max(200, Math.floor(maxScroll / 12));

  for (let top = 0; top <= maxScroll + step; top += step) {
    await grid.evaluate((el, y) => {
      el.scrollTop = y;
    }, top);
    await page.waitForTimeout(120);

    const batch = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.card-list-cell')];
      return cells.map((cell) => {
        const card = cell.querySelector('.group');
        const imgSlot = cell.querySelector('.card-image-slot');
        const infoBlock = cell.querySelector('[data-card-info]');
        const spacer = cell.querySelector('[data-card-body-spacer]');
        const action = cell.querySelector(
          'button[aria-label*="加入"], button[aria-label*="移除"]',
        );
        const name = cell.querySelector('p.line-clamp-2')?.textContent?.trim() ?? '';
        if (!name) return null;
        const infoH = infoBlock?.getBoundingClientRect().height ?? 0;
        const spacerH = spacer?.getBoundingClientRect().height ?? 0;
        const imgH = imgSlot?.getBoundingClientRect().height ?? 0;
        const cardH = card?.getBoundingClientRect().height ?? 0;
        const actionH = action?.getBoundingClientRect().height ?? 0;
        return {
          name,
          infoH: Math.round(infoH),
          spacerH: Math.round(spacerH),
          bodyBelowImg: Math.round(cardH - imgH - actionH),
        };
      }).filter(Boolean);
    });

    for (const r of batch) {
      const prev = allRows.get(r.name);
      if (!prev || r.infoH > prev.infoH) allRows.set(r.name, r);
    }
  }

  const rows = [...allRows.values()];

  await browser.close();

  const withInfo = rows.filter((r) => r.infoH > 0);
  if (withInfo.length === 0) {
    console.log('No virtual grid cells with gradient info found. Sample:', rows.slice(0, 3));
    process.exit(1);
  }

  const byInfo = [...withInfo].sort((a, b) => b.infoH - a.infoH);

  console.log(`Measured ${withInfo.length} cards @ ${POOL_WIDTH}px\n`);
  console.log('Top 8 by info block height:');
  for (const r of byInfo.slice(0, 8)) {
    console.log(
      `  ${r.name}: info=${r.infoH}px spacer=${r.spacerH}px bodyBelowImg=${r.bodyBelowImg}px cell=${r.cellH}`,
    );
  }

  const maxInfo = byInfo[0].infoH;
  const p99 = byInfo[Math.floor(byInfo.length * 0.01)]?.infoH ?? maxInfo;
  const avgSpacerOnTallest = byInfo[0].spacerH;

  console.log(`\nmax infoH=${maxInfo}  p99=${p99}  tallest spacer=${avgSpacerOnTallest}`);
  console.log(`Suggested CARD_BODY_HEIGHT_MOBILE=${maxInfo} (or ${maxInfo + 4} with buffer)`);

  const colW = POOL_WIDTH / 2;
  const imageH = Math.ceil(colW * (4 / 3));
  const actionH = 36;
  const gap = 4;
  for (const body of [maxInfo, maxInfo + 4, 158]) {
    const rowH = imageH + body + actionH + gap;
    console.log(`  rowHeight(body=${body}): ${rowH}`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});

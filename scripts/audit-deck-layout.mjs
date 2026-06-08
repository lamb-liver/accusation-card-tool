/**
 * Verbose deck layout dump — same metrics as test:deck-layout.
 * npm run audit:deck-layout
 */
import { chromium } from 'playwright';
import { collectDeckLayoutMetrics } from './lib/deck-layout-metrics.mjs';

const BASE_URL = process.env.DECK_LAYOUT_BASE_URL || 'http://localhost:5173';

async function dump(page, label, beforeDeck) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  if (beforeDeck) await beforeDeck(page);
  await page.getByRole('button', { name: /組牌(?:模式)?/ }).click();
  await page.getByRole('heading', { name: '可選卡牌池' }).waitFor({ timeout: 20000 });
  const metrics = await page.evaluate(collectDeckLayoutMetrics);
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(metrics, null, 2));
  return metrics;
}

async function audit() {
  const browser = await chromium.launch({ headless: true });
  let failed = 0;

  const cases = [
    ['desktop-full-pool', { width: 1280, height: 800 }, null],
    [
      'desktop-empty-pool',
      { width: 1280, height: 800 },
      async (p) => p.getByRole('textbox', { name: '搜尋卡片' }).fill('zzznomatchzzz'),
    ],
    ['mobile-full-pool', { width: 390, height: 844 }, null],
  ];

  for (const [label, viewport, beforeDeck] of cases) {
    const page = await browser.newPage({ viewport });
    const m = await dump(page, label, beforeDeck);
    if (!m.pageFitsViewport) failed += 1;
    if (m.scrollContainerCount > 2) failed += 1;
    await page.close();
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

audit().catch((err) => {
  console.error(err);
  process.exit(2);
});

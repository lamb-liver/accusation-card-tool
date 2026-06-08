/**
 * Deck mode layout regression — requires dev server at BASE_URL (default http://localhost:5173).
 *
 *   npm run dev
 *   npm run test:deck-layout
 */
import { chromium } from 'playwright';
import { collectDeckLayoutMetrics } from './lib/deck-layout-metrics.mjs';
import { getChromiumLaunchOptions } from './lib/playwright-browser.mjs';

const MAX_DECK_SCROLL_CONTAINERS = 2;

async function resolveBaseUrl() {
  if (process.env.DECK_LAYOUT_BASE_URL) return process.env.DECK_LAYOUT_BASE_URL;
  for (const url of ['http://localhost:4173', 'http://localhost:5173']) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return url;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    'No server found. Run: npm run build && npm run preview  OR  npm run dev (restart after layout changes)',
  );
}

let failed = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed += 1;
}

function expect(condition, message) {
  if (!condition) fail(message);
}

async function openDeckMode(page, baseUrl, { beforeDeck } = {}) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  if (beforeDeck) await beforeDeck(page);
  await page.getByRole('button', { name: /組牌(?:模式)?/ }).click();
  await page.getByRole('heading', { name: '可選卡牌池' }).waitFor({ timeout: 20000 });
  return page.evaluate(collectDeckLayoutMetrics);
}

function assertDeckLayout(
  metrics,
  label,
  { maxScrollContainers = MAX_DECK_SCROLL_CONTAINERS, expectVirtual, expectPageScroll } = {},
) {
  if (expectPageScroll) {
    expect(
      metrics.docScroll > metrics.innerH + 5,
      `${label}: page should scroll (docScroll ${metrics.docScroll} > innerHeight ${metrics.innerH})`,
    );
    expect(metrics.hasFooter, `${label}: expected AppFooter in deck mode`);
  }
  expect(
    metrics.scrollContainerCount <= maxScrollContainers,
    `${label}: expected at most ${maxScrollContainers} top-level scroll containers, got ${metrics.scrollContainerCount}: ${JSON.stringify(metrics.scrollContainers)}`,
  );
  if (expectVirtual === true) {
    expect(metrics.hasVirtualGrid, `${label}: expected virtualized card-gallery-grid`);
  }
  if (expectVirtual === false) {
    expect(!metrics.hasVirtualGrid, `${label}: expected non-virtual CSS grid path`);
  }
}

async function run() {
  const baseUrl = await resolveBaseUrl();
  console.log(`Using ${baseUrl}`);
  const browser = await chromium.launch(getChromiumLaunchOptions());

  try {
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const m = await openDeckMode(page, baseUrl);
      assertDeckLayout(m, 'desktop-full-pool', { expectVirtual: true, expectPageScroll: true });
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const m = await openDeckMode(page, baseUrl, {
        beforeDeck: async (p) => {
          await p.getByRole('textbox', { name: '搜尋卡片' }).fill('zzznomatchzzz');
        },
      });
      assertDeckLayout(m, 'desktop-empty-pool', { expectVirtual: false });
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const m = await openDeckMode(page, baseUrl);
      assertDeckLayout(m, 'mobile-full-pool', { expectVirtual: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (failed > 0) {
    console.error(`\n${failed} assertion(s) failed.`);
    process.exit(1);
  }
  console.log('OK: deck layout assertions passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(2);
});

import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { getChromiumLaunchOptions } from './lib/playwright-browser.mjs';

const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1280, height: 800 },
];

const ROUTES = [
  { name: 'gallery', hash: '#/', ready: '[aria-label="搜尋卡片"]' },
  { name: 'deck', hash: '#/deck', ready: 'h2:text-is("可選卡牌池")' },
  { name: 'community', hash: '#/community', ready: 'h2:text-is("交流區")' },
  { name: 'qa', hash: '#/qa', ready: '[aria-label="搜尋常見問題"]' },
  { name: 'clock', hash: '#/clock', ready: '[aria-label="對局計時器"]' },
  { name: 'admin', hash: '#/admin', ready: 'h2:text-is("管理後台")' },
];

function baseUrl() {
  return process.env.SITE_SMOKE_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:5173';
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const controls = [...document.querySelectorAll('button, input, select, [role="dialog"], nav')]
      .filter((element) => {
        if (!(element instanceof HTMLElement) || element.closest('[inert]')) return false;
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40) || element.tagName,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        };
      });

    return {
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      invalidControls: controls.filter(
        ({ left, right, width, height }) =>
          left < -1 || right > innerWidth + 1 || width <= 0 || height <= 0,
      ),
      brokenImages: [...document.images]
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
    };
  });
}

async function assertPage(page, label) {
  const report = await inspectPage(page);
  assert.ok(
    report.documentWidth <= report.viewportWidth + 1,
    `${label}: document overflow ${report.documentWidth}px > ${report.viewportWidth}px`,
  );
  assert.ok(
    report.bodyWidth <= report.viewportWidth + 1,
    `${label}: body overflow ${report.bodyWidth}px > ${report.viewportWidth}px`,
  );
  assert.deepEqual(report.invalidControls, [], `${label}: invalid control bounds`);
  assert.deepEqual(report.brokenImages, [], `${label}: broken rendered images`);
}

async function assertInternalLinks(page) {
  const urls = await page.locator('a[href]').evaluateAll((links) => {
    const origin = window.location.origin;
    return [...new Set(links.map((link) => link.href))].filter((href) => {
      const url = new URL(href);
      return url.origin === origin && !url.hash;
    });
  });

  for (const url of urls) {
    const response = await page.request.get(url);
    assert.ok(response.ok(), `internal link failed (${response.status()}): ${url}`);
  }
}

async function run() {
  const browser = await chromium.launch(getChromiumLaunchOptions());
  const url = baseUrl();

  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport });

      for (const route of ROUTES) {
        const label = `${route.name}-${viewport.width}`;
        await page.goto(`${url}${route.hash}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.locator(route.ready).first().waitFor({ timeout: 30_000 });
        await page.waitForTimeout(300);
        await assertPage(page, label);

        if (route.name === 'gallery') {
          await assertInternalLinks(page);

          if (viewport.width < 768) {
            await page.getByRole('button', { name: '開啟篩選' }).click();
            await page.getByRole('button', { name: '關閉抽屜' }).waitFor();
            await assertPage(page, `${label}-drawer`);
            await page.getByRole('button', { name: '關閉抽屜' }).click();
          }

          await page.locator('[aria-label^="查看卡牌："]').first().click();
          await page.getByRole('dialog').waitFor();
          await assertPage(page, `${label}-card-modal`);
          await page.getByRole('button', { name: '關閉', exact: true }).click();
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`OK: site smoke passed (${ROUTES.length} routes × ${VIEWPORTS.length} viewports).`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

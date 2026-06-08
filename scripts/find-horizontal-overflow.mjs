/**
 * 找出 scrollWidth > clientWidth 的元素
 */
import { chromium } from 'playwright';
import { getChromiumLaunchOptions } from './lib/playwright-browser.mjs';

const VIEWPORT = { width: 453, height: 737 };
const URL = process.env.BASE_URL ?? 'http://localhost:5176/';

const browser = await chromium.launch(getChromiumLaunchOptions());
const page = await browser.newPage({ viewport: VIEWPORT });

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: /組牌(?:模式)?/ }).click();
  await page.getByRole('heading', { name: '可選卡牌池' }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2000);

  const report = await page.evaluate(() => {
    const describeEl = (el) => {
      const cls =
        typeof el.className === 'string' && el.className.trim()
          ? el.className.trim()
          : '';
      return { tag: el.tagName, id: el.id || null, className: cls || null };
    };

    const measure = (el) => {
      if (!(el instanceof HTMLElement)) return null;
      const cs = getComputedStyle(el);
      return {
        ...describeEl(el),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        diff: el.scrollWidth - el.clientWidth,
        overflows: el.scrollWidth > el.clientWidth + 1,
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
      };
    };

    const walk = (root) => {
      const out = [];
      const go = (el) => {
        if (!(el instanceof HTMLElement)) return;
        const m = measure(el);
        if (m?.overflows) out.push(m);
        for (const c of el.children) go(c);
      };
      go(root);
      return out.sort((a, b) => b.diff - a.diff);
    };

    const grid = document.querySelector('[role="grid"]');
    const gridInner = grid
      ? [...grid.children].map((c) => ({
          ...describeEl(c),
          scrollWidth: c.scrollWidth,
          clientWidth: c.clientWidth,
          diff: c.scrollWidth - c.clientWidth,
          styleWidth: c instanceof HTMLElement ? c.style.width : null,
          styleHeight: c instanceof HTMLElement ? c.style.height : null,
        }))
      : [];

    const pool = document.querySelector('.deck-pool-section');
    const poolChain = [];
    let n = pool;
    while (n) {
      poolChain.push(measure(n));
      n = n.parentElement;
    }

    const gridChain = [];
    n = grid;
    while (n) {
      gridChain.push(measure(n));
      n = n.parentElement;
    }

    return {
      viewport: { w: innerWidth, h: innerHeight },
      poolOffenders: pool ? walk(pool) : [],
      gridOffenders: grid ? walk(grid) : [],
      gridDirectChildren: gridInner,
      poolToBodyChain: poolChain,
      gridToBodyChain: gridChain,
      scrollableOverflow: [...document.querySelectorAll('*')]
        .filter((el) => {
          if (!(el instanceof HTMLElement)) return false;
          const ox = getComputedStyle(el).overflowX;
          return (
            (ox === 'auto' || ox === 'scroll') &&
            el.scrollWidth > el.clientWidth + 1
          );
        })
        .map((el) => measure(el))
        .sort((a, b) => b.diff - a.diff),
    };
  });

  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

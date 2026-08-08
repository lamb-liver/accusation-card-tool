#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://accusation-card-tool.pages.dev';
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, 'dist');
const cards = JSON.parse(await readFile(resolve(projectRoot, 'public/cards.json'), 'utf8'));

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsonLd(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function summary(value, maxLength = 150) {
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function pageShell({ title, description, canonical, image, structuredData, body, robots = 'index, follow' }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(canonical);
  const safeImage = image ? escapeHtml(image) : '';

  return `<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#1a1a1a" />
    <meta name="description" content="${safeDescription}" />
    <meta name="robots" content="${robots}, max-image-preview:large" />
    <link rel="canonical" href="${safeCanonical}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:site_name" content="《控訴》LCG 查卡工具" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:url" content="${safeCanonical}" />
    ${image ? `<meta property="og:image" content="${safeImage}" />\n    <meta property="og:image:alt" content="${safeTitle}" />\n    <meta name="twitter:card" content="summary" />\n    <meta name="twitter:image" content="${safeImage}" />` : '<meta name="twitter:card" content="summary" />'}
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <script type="application/ld+json">${jsonLd(structuredData)}</script>
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #171511; color: #e7e1d6; }
      * { box-sizing: border-box; }
      body { margin: 0; background: radial-gradient(circle at top, #29231a, #12100d 48rem); }
      a { color: #e4c65a; }
      .wrap { width: min(68rem, 100% - 2rem); margin: 0 auto; }
      header, footer { padding: 1.25rem 0; }
      main { min-height: 70vh; padding: 1rem 0 3rem; }
      h1 { color: #f2cf4a; line-height: 1.25; }
      .card-detail { display: grid; grid-template-columns: minmax(14rem, 22rem) 1fr; gap: 2rem; align-items: start; }
      .card-detail img { width: 100%; height: auto; border-radius: .75rem; box-shadow: 0 1rem 3rem #0009; }
      .meta { color: #b8afa0; }
      .effect { font-size: 1.1rem; line-height: 1.85; white-space: pre-line; }
      .button { display: inline-block; margin-top: 1rem; border: 1px solid #e4c65a; border-radius: 999px; padding: .7rem 1rem; text-decoration: none; font-weight: 700; }
      .groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; }
      .group { border: 1px solid #403a31; border-radius: .75rem; background: #1d1a16cc; padding: 1rem; }
      .group h2 { margin-top: 0; color: #f2cf4a; }
      .group ul { margin-bottom: 0; padding-left: 1.25rem; line-height: 1.8; }
      @media (max-width: 44rem) { .card-detail { grid-template-columns: 1fr; } .card-detail img { max-width: 24rem; margin: 0 auto; } }
    </style>
  </head>
  <body>
    <header><nav class="wrap" aria-label="頁面導覽"><a href="/">《控訴》LCG 查卡工具</a></nav></header>
    <main class="wrap">${body}</main>
    <footer><p class="wrap">© 愚人古堡工作室</p></footer>
  </body>
</html>\n`;
}

function cardPage(card) {
  const canonical = `${SITE_URL}/card/${encodeURIComponent(card.id)}/`;
  const image = `${SITE_URL}/images/${encodeURIComponent(card.id)}-w640.webp`;
  const title = `${card.name}（${card.faction}）卡牌資料｜《控訴》LCG`;
  const description = summary(`《控訴》LCG ${card.faction}${card.type}「${card.name}」：${card.effect}`);
  const symbols = Array.isArray(card.symbols) && card.symbols.length > 0
    ? `<p><strong>符號：</strong>${card.symbols.map(escapeHtml).join('、')}</p>`
    : '';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url: canonical,
    description,
    inLanguage: 'zh-TW',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    primaryImageOfPage: { '@type': 'ImageObject', url: image },
    mainEntity: {
      '@type': 'Thing',
      name: card.name,
      identifier: card.id,
      description: card.effect,
      category: `${card.faction} ${card.type}`,
    },
  };
  const body = `<article class="card-detail">
      <img src="/images/${escapeHtml(card.id)}-w640.webp" width="640" height="893" alt="《控訴》卡牌「${escapeHtml(card.name)}」" />
      <div>
        <p class="meta">${escapeHtml(card.faction)} · ${escapeHtml(card.type)} · ${escapeHtml(card.source)}</p>
        <h1>${escapeHtml(card.name)}</h1>
        <p class="effect">${escapeHtml(card.effect)}</p>
        ${symbols}
        <p class="meta">卡牌編號：${escapeHtml(card.id)}</p>
        <a class="button" href="/#/?card=${encodeURIComponent(card.id)}">在互動查卡工具中開啟</a>
      </div>
    </article>`;
  return pageShell({ title, description, canonical, image, structuredData, body });
}

function indexPage() {
  const groups = new Map();
  for (const card of cards) {
    if (!groups.has(card.faction)) groups.set(card.faction, []);
    groups.get(card.faction).push(card);
  }
  const body = `<h1>《控訴》LCG 卡牌索引</h1>
    <p>依教團瀏覽卡名、種類與卡牌效果；需要篩選、異畫切換或組牌時，可返回互動查卡工具。</p>
    <p><a class="button" href="/">開啟互動查卡工具</a></p>
    <div class="groups">${[...groups].map(([faction, factionCards]) => `<section class="group"><h2>${escapeHtml(faction)}</h2><ul>${factionCards.map((card) => `<li><a href="/card/${encodeURIComponent(card.id)}/">${escapeHtml(card.name)}</a> <span class="meta">${escapeHtml(card.type)}</span></li>`).join('')}</ul></section>`).join('')}</div>`;
  return pageShell({
    title: '《控訴》LCG 卡牌索引｜卡名、教團與種類',
    description: `瀏覽《控訴》LCG 全部 ${cards.length} 張卡牌，依教團查找卡名、種類、符號與卡牌效果。`,
    canonical: `${SITE_URL}/card/`,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: '《控訴》LCG 卡牌索引',
      url: `${SITE_URL}/card/`,
      description: `《控訴》LCG ${cards.length} 張卡牌索引。`,
      inLanguage: 'zh-TW',
      isPartOf: { '@id': `${SITE_URL}/#website` },
    },
    body,
  });
}

if (!Array.isArray(cards) || cards.length === 0) throw new Error('SEO pages: cards.json must be a non-empty array');
if (cards.some((card) => !/^[a-z0-9-]+$/.test(card.id))) throw new Error('SEO pages: invalid card id');

await mkdir(resolve(outputRoot, 'card'), { recursive: true });
await writeFile(resolve(outputRoot, 'card/index.html'), indexPage());
await Promise.all(cards.map(async (card) => {
  const directory = resolve(outputRoot, 'card', card.id);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'index.html'), cardPage(card));
}));

const sitemapUrls = [`${SITE_URL}/`, `${SITE_URL}/card/`, ...cards.map((card) => `${SITE_URL}/card/${card.id}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}
</urlset>\n`;
await writeFile(resolve(outputRoot, 'sitemap.xml'), sitemap);

const notFound = pageShell({
  title: '找不到頁面｜《控訴》LCG 查卡工具',
  description: '找不到指定的《控訴》LCG 卡牌頁面。',
  canonical: `${SITE_URL}/404.html`,
  structuredData: { '@context': 'https://schema.org', '@type': 'WebPage', name: '找不到頁面' },
  robots: 'noindex, follow',
  body: '<h1>找不到頁面</h1><p>這個卡牌頁面不存在或已移動。</p><p><a class="button" href="/card/">瀏覽卡牌索引</a></p>',
});
await writeFile(resolve(outputRoot, '404.html'), notFound);

if (sitemapUrls.length !== cards.length + 2) throw new Error('SEO pages: sitemap count mismatch');
console.log(`SEO pages: generated ${cards.length} card pages and ${sitemapUrls.length} sitemap URLs`);

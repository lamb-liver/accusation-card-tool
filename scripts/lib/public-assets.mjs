import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getCardArtVariants,
  getCardImageAvifSrc,
  getCardPictureSources,
} from '../../src/utils/cardAlternateArt.js';
import { FACTION_ORDER, factionIconPath } from '../../src/constants/factionOrder.js';
import { SYMBOL_ICONS } from '../../src/constants/symbols.js';
import { LCP_CARD_ID, LCP_IMAGE_WIDTH } from '../../src/utils/galleryLayout.js';

export const CARD_JSON_PATH = 'public/cards.json';
export const STATIC_PUBLIC_ASSETS = [
  'public/favicon.svg',
  'public/manifest.webmanifest',
  'public/robots.txt',
  'public/sitemap.xml',
  // footer「下載規則書」的目標檔；曾在部署整理時被誤刪導致下載到 SPA fallback 的 HTML
  'public/rules.pdf',
  // 展示用襯線字體子集（見 scripts/build-display-font.mjs）與其 SIL OFL 授權
  'public/fonts/NotoSerifTC-display-subset.woff2',
  'public/fonts/OFL.txt',
];

export function normalizePublicPath(path) {
  if (typeof path !== 'string') return null;
  if (
    !path ||
    path.startsWith('data:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return null;
  }
  const noQuery = path.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  return noQuery.startsWith('public/') ? noQuery : `public/${noQuery}`;
}

export function readJson(projectRoot, path, failures = []) {
  const absolutePath = resolve(projectRoot, path);
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    failures.push(`Cannot read JSON: ${path} (${error.message})`);
    return null;
  }
}

export function parseSrcSet(srcSet) {
  if (typeof srcSet !== 'string') return [];
  return srcSet
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function addRequired(required, path, reason) {
  if (!path) return;
  const normalized = normalizePublicPath(path);
  if (!normalized) return;
  if (!required.has(normalized)) required.set(normalized, new Set());
  required.get(normalized).add(reason);
}

function collectCatalogCards(projectRoot, required, failures) {
  addRequired(required, CARD_JSON_PATH, 'card catalog');
  const cards = readJson(projectRoot, CARD_JSON_PATH, failures);
  if (!Array.isArray(cards)) {
    failures.push(`${CARD_JSON_PATH} must be an array`);
    return [];
  }
  const seenIds = new Set();

  for (const card of cards) {
    if (!card || typeof card.id !== 'string' || !card.id) {
      failures.push(`${CARD_JSON_PATH} contains a card without a string id`);
      continue;
    }
    if (seenIds.has(card.id)) failures.push(`Duplicate card id: ${card.id}`);
    seenIds.add(card.id);
  }
  return cards;
}

function collectCardArt(required, cards) {
  for (const card of cards) {
    const variants = getCardArtVariants(card);

    for (const variant of variants) {
      const picture = getCardPictureSources(card.id, variant);
      addRequired(required, picture.fallbackSrc, `card ${card.id} ${variant} fallback image`);
      addRequired(required, picture.fullSrc, `card ${card.id} ${variant} full image`);
      for (const src of parseSrcSet(picture.webpSrcSet)) {
        addRequired(required, src, `card ${card.id} ${variant} webp srcset`);
      }
      for (const src of parseSrcSet(picture.avifSrcSet)) {
        addRequired(required, src, `card ${card.id} ${variant} avif srcset`);
      }
    }
  }

  addRequired(
    required,
    getCardImageAvifSrc(LCP_CARD_ID, 'main', LCP_IMAGE_WIDTH),
    'HTML/JS LCP preload target',
  );
}

function collectUiAssets(required) {
  for (const asset of STATIC_PUBLIC_ASSETS) addRequired(required, asset, 'static public asset');

  for (const src of Object.values(SYMBOL_ICONS)) {
    addRequired(required, src, 'symbol icon');
  }

  for (const faction of FACTION_ORDER) {
    addRequired(required, factionIconPath(faction, '左'), `faction icon ${faction} left`);
    addRequired(required, factionIconPath(faction, '右'), `faction icon ${faction} right`);
  }
}

export function collectRequiredPublicAssets(projectRoot) {
  const required = new Map();
  const failures = [];
  const cards = collectCatalogCards(projectRoot, required, failures);
  collectCardArt(required, cards);
  collectUiAssets(required);
  return { required, failures, cards };
}

export function checkRequiredFiles(projectRoot, required) {
  const failures = [];
  for (const [path, reasons] of required) {
    const absolutePath = resolve(projectRoot, path);
    if (!existsSync(absolutePath)) {
      failures.push(`Missing asset: ${path} (${[...reasons].join('; ')})`);
      continue;
    }
    if (!statSync(absolutePath).isFile()) {
      failures.push(`Expected file but found non-file asset: ${path}`);
    }
  }
  return failures;
}

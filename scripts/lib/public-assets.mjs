import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  cardHasAlternateArt,
  getCardImageAvifSrc,
  getCardPictureSources,
} from '../../src/utils/cardAlternateArt.js';
import { FILTER_OPTIONS } from '../../src/constants/filterOptions.js';
import { FACTION_ORDER, factionIconPath } from '../../src/constants/factionOrder.js';
import { SYMBOL_ICONS } from '../../src/constants/symbols.js';
import { APP_BACKGROUND_IMAGE } from '../../src/constants/appBackground.js';
import { LCP_CARD_ID, LCP_IMAGE_WIDTH } from '../../src/utils/galleryLayout.js';

export const INDEX_PATH = 'public/cards/index.json';
export const CARD_JSON_SOURCE_PATH = 'public/cards.json';
export const STATIC_PUBLIC_ASSETS = [
  'public/favicon.svg',
  'public/manifest.webmanifest',
  'public/robots.txt',
  'public/sitemap.xml',
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
  addRequired(required, INDEX_PATH, 'card catalog index');

  const index = readJson(projectRoot, INDEX_PATH, failures);
  if (!index) return { cards: [], index: null };

  if (!Array.isArray(index.shards) || index.shards.length === 0) {
    failures.push(`${INDEX_PATH} must contain a non-empty shards array`);
    return { cards: [], index };
  }

  const cards = [];
  const seenIds = new Set();
  let declaredTotal = 0;

  for (const shard of index.shards) {
    if (!shard || typeof shard.path !== 'string') {
      failures.push(`${INDEX_PATH} contains a shard without a string path`);
      continue;
    }

    const shardPath = normalizePublicPath(shard.path);
    addRequired(required, shardPath, `card catalog shard ${shard.key ?? shard.path}`);

    const shardCards = readJson(projectRoot, shardPath, failures);
    if (!Array.isArray(shardCards)) {
      failures.push(`${shardPath} must be an array`);
      continue;
    }

    if (typeof shard.count === 'number' && shardCards.length !== shard.count) {
      failures.push(`${shardPath} count mismatch: index=${shard.count}, actual=${shardCards.length}`);
    }
    declaredTotal += shard.count ?? shardCards.length;

    for (const card of shardCards) {
      if (!card || typeof card.id !== 'string' || !card.id) {
        failures.push(`${shardPath} contains a card without a string id`);
        continue;
      }
      if (seenIds.has(card.id)) failures.push(`Duplicate card id across shards: ${card.id}`);
      seenIds.add(card.id);
      cards.push(card);
    }
  }

  if (typeof index.total === 'number' && cards.length !== index.total) {
    failures.push(`${INDEX_PATH} total mismatch: index=${index.total}, actual=${cards.length}`);
  }
  if (typeof index.total === 'number' && declaredTotal !== index.total) {
    failures.push(`${INDEX_PATH} shard counts do not add up: total=${index.total}, shards=${declaredTotal}`);
  }

  return { cards, index };
}

function collectCardArt(required, cards) {
  for (const card of cards) {
    const variants = ['main'];
    if (cardHasAlternateArt(card)) variants.push('alt');

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
  addRequired(required, CARD_JSON_SOURCE_PATH, 'card catalog maintenance source');
  addRequired(required, APP_BACKGROUND_IMAGE, 'app page background');

  for (const src of Object.values(SYMBOL_ICONS)) {
    addRequired(required, src, 'symbol icon');
  }

  for (const options of Object.values(FILTER_OPTIONS)) {
    for (const option of options) {
      addRequired(required, option.iconSrc, `filter option icon ${option.label}`);
    }
  }

  for (const faction of FACTION_ORDER) {
    addRequired(required, factionIconPath(faction, '左'), `faction icon ${faction} left`);
    addRequired(required, factionIconPath(faction, '右'), `faction icon ${faction} right`);
  }
}

export function collectRequiredPublicAssets(projectRoot) {
  const required = new Map();
  const failures = [];
  const { cards, index } = collectCatalogCards(projectRoot, required, failures);
  collectCardArt(required, cards);
  collectUiAssets(required);
  return { required, failures, cards, index };
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

export function expectedPrecompressedCardShardPaths(required) {
  const out = [];
  const shardPaths = [...required.keys()].filter((path) => /^public\/cards\/.+\.json$/.test(path));
  for (const path of shardPaths) {
    if (path === INDEX_PATH) continue;
    out.push(`${path}.br`, `${path}.gz`);
  }
  return out;
}

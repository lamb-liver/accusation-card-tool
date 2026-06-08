#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  cardHasAlternateArt,
  getCardImageAvifSrc,
  getCardPictureSources,
} from '../src/utils/cardAlternateArt.js';
import { FILTER_OPTIONS } from '../src/constants/filterOptions.js';
import { FACTION_ORDER, factionIconPath } from '../src/constants/factionOrder.js';
import { SYMBOL_ICONS } from '../src/constants/symbols.js';
import { APP_BACKGROUND_IMAGE } from '../src/constants/appBackground.js';
import { LCP_CARD_ID, LCP_IMAGE_WIDTH } from '../src/utils/galleryLayout.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const STRICT_PRECOMPRESSED = process.argv.includes('--strict-precompressed');
const INDEX_PATH = 'public/cards/index.json';
const CARD_JSON_SOURCE_PATH = 'public/cards.json';
const STATIC_PUBLIC_ASSETS = [
  'public/favicon.svg',
  'public/manifest.webmanifest',
  'public/robots.txt',
  'public/sitemap.xml',
];

const required = new Map();
const failures = [];

function addRequired(path, reason) {
  if (!path) return;
  const normalized = normalizePublicPath(path);
  if (!normalized) return;
  if (!required.has(normalized)) required.set(normalized, new Set());
  required.get(normalized).add(reason);
}

function addFailure(message) {
  failures.push(message);
}

function normalizePublicPath(path) {
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

function readJson(path) {
  const absolutePath = resolve(projectRoot, path);
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    addFailure(`Cannot read JSON: ${path} (${error.message})`);
    return null;
  }
}

function parseSrcSet(srcSet) {
  if (typeof srcSet !== 'string') return [];
  return srcSet
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function collectCatalogCards() {
  addRequired(INDEX_PATH, 'card catalog index');

  const index = readJson(INDEX_PATH);
  if (!index) return [];

  if (!Array.isArray(index.shards) || index.shards.length === 0) {
    addFailure(`${INDEX_PATH} must contain a non-empty shards array`);
    return [];
  }

  const cards = [];
  const seenIds = new Set();
  let declaredTotal = 0;

  for (const shard of index.shards) {
    if (!shard || typeof shard.path !== 'string') {
      addFailure(`${INDEX_PATH} contains a shard without a string path`);
      continue;
    }

    const shardPath = normalizePublicPath(shard.path);
    addRequired(shardPath, `card catalog shard ${shard.key ?? shard.path}`);

    const shardCards = readJson(shardPath);
    if (!Array.isArray(shardCards)) {
      addFailure(`${shardPath} must be an array`);
      continue;
    }

    if (typeof shard.count === 'number' && shardCards.length !== shard.count) {
      addFailure(`${shardPath} count mismatch: index=${shard.count}, actual=${shardCards.length}`);
    }
    declaredTotal += shard.count ?? shardCards.length;

    for (const card of shardCards) {
      if (!card || typeof card.id !== 'string' || !card.id) {
        addFailure(`${shardPath} contains a card without a string id`);
        continue;
      }
      if (seenIds.has(card.id)) addFailure(`Duplicate card id across shards: ${card.id}`);
      seenIds.add(card.id);
      cards.push(card);
    }
  }

  if (typeof index.total === 'number' && cards.length !== index.total) {
    addFailure(`${INDEX_PATH} total mismatch: index=${index.total}, actual=${cards.length}`);
  }
  if (typeof index.total === 'number' && declaredTotal !== index.total) {
    addFailure(`${INDEX_PATH} shard counts do not add up: total=${index.total}, shards=${declaredTotal}`);
  }

  return cards;
}

function collectCardArt(cards) {
  for (const card of cards) {
    const variants = ['main'];
    if (cardHasAlternateArt(card)) variants.push('alt');

    for (const variant of variants) {
      const picture = getCardPictureSources(card.id, variant);
      addRequired(picture.fallbackSrc, `card ${card.id} ${variant} fallback image`);
      addRequired(picture.fullSrc, `card ${card.id} ${variant} full image`);
      for (const src of parseSrcSet(picture.webpSrcSet)) {
        addRequired(src, `card ${card.id} ${variant} webp srcset`);
      }
      for (const src of parseSrcSet(picture.avifSrcSet)) {
        addRequired(src, `card ${card.id} ${variant} avif srcset`);
      }
    }
  }

  addRequired(
    getCardImageAvifSrc(LCP_CARD_ID, 'main', LCP_IMAGE_WIDTH),
    'HTML/JS LCP preload target',
  );
}

function collectUiAssets() {
  for (const asset of STATIC_PUBLIC_ASSETS) addRequired(asset, 'static public asset');
  addRequired(CARD_JSON_SOURCE_PATH, 'card catalog maintenance source');
  addRequired(APP_BACKGROUND_IMAGE, 'app page background');

  for (const src of Object.values(SYMBOL_ICONS)) {
    addRequired(src, 'symbol icon');
  }

  for (const options of Object.values(FILTER_OPTIONS)) {
    for (const option of options) {
      addRequired(option.iconSrc, `filter option icon ${option.label}`);
    }
  }

  for (const faction of FACTION_ORDER) {
    addRequired(factionIconPath(faction, '左'), `faction icon ${faction} left`);
    addRequired(factionIconPath(faction, '右'), `faction icon ${faction} right`);
  }
}

function checkRequiredFiles() {
  for (const [path, reasons] of required) {
    const absolutePath = resolve(projectRoot, path);
    if (!existsSync(absolutePath)) {
      addFailure(`Missing asset: ${path} (${[...reasons].join('; ')})`);
      continue;
    }
    if (!statSync(absolutePath).isFile()) {
      addFailure(`Expected file but found non-file asset: ${path}`);
    }
  }
}

function checkPrecompressedCardShards() {
  if (!STRICT_PRECOMPRESSED) return;

  const shardPaths = [...required.keys()].filter((path) => /^public\/cards\/.+\.json$/.test(path));
  for (const path of shardPaths) {
    if (path === INDEX_PATH) continue;
    for (const ext of ['br', 'gz']) {
      const compressedPath = `${path}.${ext}`;
      if (!existsSync(resolve(projectRoot, compressedPath))) {
        addFailure(`Missing precompressed card shard: ${compressedPath}`);
      }
    }
  }
}

function printReport({ cardCount }) {
  console.log('check-assets: scanned assets');
  console.log(`  cards: ${cardCount}`);
  console.log(`  required files: ${required.size}`);

  if (failures.length > 0) {
    console.error('\nFailures:');
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(`\ncheck-assets: failed (${failures.length} issue(s))`);
    process.exit(1);
  }

  console.log('\ncheck-assets: ok');
}

const cards = collectCatalogCards();
collectCardArt(cards);
collectUiAssets();
checkRequiredFiles();
checkPrecompressedCardShards();
printReport({ cardCount: cards.length });

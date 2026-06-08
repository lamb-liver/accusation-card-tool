#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkRequiredFiles,
  collectRequiredPublicAssets,
  expectedPrecompressedCardShardPaths,
} from './lib/public-assets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const strictPrecompressed = process.argv.includes('--strict-precompressed');

const { required, failures, cards } = collectRequiredPublicAssets(projectRoot);
failures.push(...checkRequiredFiles(projectRoot, required));

if (strictPrecompressed) {
  for (const path of expectedPrecompressedCardShardPaths(required)) {
    failures.push(...checkRequiredFiles(projectRoot, new Map([[path, new Set(['precompressed card shard'])]])));
  }
}

console.log('check-assets: scanned assets');
console.log(`  cards: ${cards.length}`);
console.log(`  required files: ${required.size}`);

if (failures.length > 0) {
  console.error('\nFailures:');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(`\ncheck-assets: failed (${failures.length} issue(s))`);
  process.exit(1);
}

console.log('\ncheck-assets: ok');

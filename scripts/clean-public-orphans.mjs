#!/usr/bin/env node
import { unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPublicOrphanReport, summarizeBytes } from './lib/public-orphans.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const apply = process.argv.includes('--apply');
const report = getPublicOrphanReport(projectRoot);
const targets = report.buckets.safeRemove;

if (report.failures.length > 0) {
  console.error('clean-public-orphans: cannot continue because asset analysis failed');
  for (const failure of report.failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`clean-public-orphans: ${apply ? 'apply' : 'dry-run'}`);
console.log(`  safe targets: ${targets.length} file(s), ${summarizeBytes(targets)} bytes`);

for (const item of targets) {
  console.log(`  ${apply ? 'remove' : 'would remove'} ${item.path} (${item.reason})`);
}

if (!apply) {
  console.log('\nNo files changed. Re-run with --apply to remove safe targets.');
  process.exit(0);
}

for (const item of targets) {
  unlinkSync(resolve(projectRoot, item.path));
}

console.log('\nclean-public-orphans: done');

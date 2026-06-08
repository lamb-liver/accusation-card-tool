#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPublicOrphanReport, summarizeBytes } from './lib/public-orphans.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const failOnSafe = args.has('--fail-on-safe');
const failOnReview = args.has('--fail-on-review');

const report = getPublicOrphanReport(projectRoot);

if (asJson) {
  console.log(JSON.stringify(report.buckets, null, 2));
} else {
  console.log('check-public-orphans');
  for (const [name, items] of Object.entries(report.buckets)) {
    console.log(`  ${name}: ${items.length} file(s), ${summarizeBytes(items)} bytes`);
  }

  for (const bucketName of ['safeRemove', 'review']) {
    const items = report.buckets[bucketName];
    if (items.length === 0) continue;
    console.log(`\n${bucketName}:`);
    for (const item of items.slice(0, 40)) {
      console.log(`  - ${item.path} (${item.reason})`);
    }
    if (items.length > 40) console.log(`  ... ${items.length - 40} more`);
  }
}

const failures = [...report.failures];
if (failOnSafe && report.buckets.safeRemove.length > 0) {
  failures.push(`${report.buckets.safeRemove.length} safe-remove public orphan(s) found`);
}
if (failOnReview && report.buckets.review.length > 0) {
  failures.push(`${report.buckets.review.length} review public orphan(s) found`);
}

if (failures.length > 0) {
  console.error('\ncheck-public-orphans: failed');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\ncheck-public-orphans: ok');

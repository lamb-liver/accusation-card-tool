#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

for (const path of ['.github/workflows/deploy.yml', 'scripts/sync-deploy.mjs', 'deploy-output']) {
  if (existsSync(resolve(projectRoot, path))) {
    failures.push(`legacy static deploy artifact path still exists: ${path}`);
  }
}

const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
if (packageJson.scripts?.['build:deploy']) {
  failures.push('legacy build:deploy script still exists');
}

const wranglerPath = resolve(projectRoot, 'wrangler.toml');
if (!existsSync(wranglerPath)) {
  failures.push('wrangler.toml is missing');
} else {
  const wrangler = readFileSync(wranglerPath, 'utf8');
  if (!/pages_build_output_dir\s*=\s*"dist"/.test(wrangler)) {
    failures.push('wrangler.toml should set pages_build_output_dir = "dist"');
  }
  if (!/migrations_dir\s*=\s*"migrations"/.test(wrangler)) {
    failures.push('wrangler.toml should set migrations_dir = "migrations"');
  }
}

console.log('check-deploy-flow');
if (failures.length > 0) {
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('check-deploy-flow: ok (Cloudflare Pages only)');

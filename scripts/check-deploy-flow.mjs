#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const failures = [];
const warnings = [];

function readOptional(path) {
  const absolutePath = resolve(projectRoot, path);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : null;
}

const workflow = readOptional('.github/workflows/deploy.yml');
const wrangler = readOptional('wrangler.toml');
const syncDeploy = readOptional('scripts/sync-deploy.mjs');

if (!workflow) {
  warnings.push('.github/workflows/deploy.yml is missing');
} else {
  if (/ref:\s*['"]?[0-9a-f]{7,40}['"]?/i.test(workflow)) {
    failures.push('deploy workflow checks out a fixed commit ref');
  }
  if (/git\s+push\b[^\n]*--force/.test(workflow) || /git\s+push\b[\s\S]*?--force/.test(workflow)) {
    failures.push('deploy workflow uses git push --force');
  }
  if (/repository:\s*['"]?lamb-liver\/accusation-card-tool['"]?/i.test(workflow)) {
    warnings.push('deploy workflow checks out the same repository explicitly');
  }
  if (/schedule:/.test(workflow) && /--force/.test(workflow)) {
    failures.push('scheduled deploy workflow can force-push without a human trigger');
  }
}

if (!wrangler) {
  failures.push('wrangler.toml is missing');
} else {
  if (!/pages_build_output_dir\s*=\s*"dist"/.test(wrangler)) {
    failures.push('wrangler.toml should set pages_build_output_dir = "dist"');
  }
  if (!/migrations_dir\s*=\s*"migrations"/.test(wrangler)) {
    warnings.push('wrangler.toml does not point D1 migrations_dir at migrations');
  }
}

if (!syncDeploy) {
  warnings.push('scripts/sync-deploy.mjs is missing');
} else {
  if (!/dist\/?['"]?\)/.test(syncDeploy) && !/distDir/.test(syncDeploy)) {
    warnings.push('sync-deploy.mjs does not obviously copy from dist');
  }
  if (!/sw\.js/.test(syncDeploy)) {
    failures.push('sync-deploy.mjs should require dist/sw.js before deploy sync');
  }
}

console.log('check-deploy-flow');
if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`  - ${warning}`);
}

if (failures.length > 0) {
  console.error('\nFailures:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\ncheck-deploy-flow: ok');

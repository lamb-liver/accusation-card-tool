#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const failures = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(resolve(projectRoot, path), 'utf8'));
  } catch (error) {
    failures.push(`Cannot read ${path}: ${error.message}`);
    return null;
  }
}

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');

if (pkg && lock) {
  if (!lock.lockfileVersion) failures.push('package-lock.json has no lockfileVersion');
  const rootPackage = lock.packages?.[''];
  if (!rootPackage) {
    failures.push('package-lock.json missing packages[""] root package entry');
  } else {
    for (const field of ['dependencies', 'devDependencies']) {
      const expected = pkg[field] ?? {};
      const actual = rootPackage[field] ?? {};
      for (const [name, version] of Object.entries(expected)) {
        if (actual[name] !== version) {
          failures.push(`lockfile root ${field}.${name} mismatch: package=${version}, lock=${actual[name] ?? '(missing)'}`);
        }
        if (!lock.packages?.[`node_modules/${name}`]) {
          failures.push(`lockfile missing package entry for node_modules/${name}`);
        }
      }
      for (const name of Object.keys(actual)) {
        if (!(name in expected)) {
          failures.push(`lockfile root has extra ${field}.${name}`);
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error('check-lockfile: failed');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('check-lockfile: ok');

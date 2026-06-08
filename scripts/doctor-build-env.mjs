#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canImportWithNode,
  getCandidateNodePaths,
  resolveNodeForPackageBin,
} from './lib/node-runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const failures = [];
const notes = [];

console.log('doctor-build-env');
console.log(`  node: ${process.version}`);
console.log(`  node path: ${process.execPath}`);
console.log(`  cwd: ${projectRoot}`);

const packageLockPath = resolve(projectRoot, 'package-lock.json');
const nodeModulesPath = resolve(projectRoot, 'node_modules');
const viteBin = resolve(projectRoot, 'node_modules/vite/bin/vite.js');
const rolldownRoot = resolve(projectRoot, 'node_modules/@rolldown');

if (!existsSync(packageLockPath)) failures.push('package-lock.json is missing');
if (!existsSync(nodeModulesPath)) failures.push('node_modules is missing; run npm install');
if (!existsSync(viteBin)) failures.push('local Vite binary is missing; run npm install');

if (existsSync(rolldownRoot)) {
  const bindings = readdirSync(rolldownRoot).filter((name) => name.startsWith('binding-'));
  console.log(`  rolldown bindings: ${bindings.length > 0 ? bindings.join(', ') : '(none)'}`);
} else {
  failures.push('@rolldown optional dependency folder is missing');
}

console.log('\nNode import candidates:');
for (const nodePath of getCandidateNodePaths()) {
  if (!existsSync(nodePath)) {
    console.log(`  ${nodePath}: missing`);
    continue;
  }
  const viteOk = canImportWithNode(nodePath, 'vite', projectRoot);
  const rolldownOk = canImportWithNode(nodePath, 'rolldown', projectRoot);
  console.log(
    `  ${nodePath}: vite=${viteOk ? 'ok' : 'fail'}, rolldown=${rolldownOk ? 'ok' : 'fail'}`,
  );
  if (nodePath === process.execPath && (!viteOk || !rolldownOk)) {
    notes.push('current npm script Node cannot import Vite/Rolldown native binding');
  }
}

const viteNode = resolveNodeForPackageBin(projectRoot, 'vite');
console.log(`\nSelected Vite Node: ${viteNode}`);
if (!canImportWithNode(viteNode, 'vite', projectRoot)) failures.push('selected Vite Node cannot import vite');
if (!canImportWithNode(viteNode, 'rolldown', projectRoot)) {
  failures.push('selected Vite Node cannot import rolldown');
}

if (notes.length > 0) {
  console.log('\nNotes:');
  for (const note of notes) console.log(`  - ${note}`);
}

if (failures.length > 0) {
  console.error('\ndoctor-build-env: failed');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nRecommended next step: repair local node_modules with npm install. Keep package-lock.json.');
  process.exit(1);
}

console.log('\ndoctor-build-env: ok');

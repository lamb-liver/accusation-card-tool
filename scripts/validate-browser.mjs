#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { resolveNodeForPackageBin } from './lib/node-runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const DEFAULT_URL = 'http://127.0.0.1:5173';

async function isReachable(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return true;
    if (child.exitCode !== null) return false;
    await delay(500);
  }
  return false;
}

function runNodeScript(scriptName, env) {
  return new Promise((resolveExit) => {
    const child = spawn(process.execPath, [resolve(projectRoot, 'scripts', scriptName)], {
      cwd: projectRoot,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });
    child.on('close', (code) => resolveExit(code ?? 1));
    child.on('error', () => resolveExit(1));
  });
}

let server = null;
const explicitUrl = process.env.DECK_LAYOUT_BASE_URL || process.env.BASE_URL;
let baseUrl = explicitUrl;

if (!baseUrl) {
  for (const candidate of ['http://127.0.0.1:4173', DEFAULT_URL]) {
    if (await isReachable(candidate)) {
      baseUrl = candidate;
      break;
    }
  }
}

if (!baseUrl) {
  const viteBin = resolve(projectRoot, 'node_modules/vite/bin/vite.js');
  if (!existsSync(viteBin)) {
    console.error('validate-browser: missing local Vite binary. Run npm install.');
    process.exit(1);
  }
  baseUrl = DEFAULT_URL;
  const nodePath = resolveNodeForPackageBin(projectRoot, 'vite');
  if (nodePath !== process.execPath) console.log(`validate-browser: using Node runtime for Vite: ${nodePath}`);
  server = spawn(nodePath, [viteBin, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  const ready = await waitForServer(baseUrl, server);
  if (!ready) {
    console.error('validate-browser: dev server did not become reachable');
    server.kill('SIGTERM');
    process.exit(1);
  }
}

try {
  console.log(`validate-browser: using ${baseUrl}`);
  const layoutCode = await runNodeScript('test-deck-layout.mjs', {
    DECK_LAYOUT_BASE_URL: baseUrl,
  });
  if (layoutCode !== 0) process.exit(layoutCode);

  const overflowCode = await runNodeScript('find-horizontal-overflow.mjs', {
    BASE_URL: baseUrl,
  });
  if (overflowCode !== 0) process.exit(overflowCode);
} finally {
  if (server) {
    server.kill('SIGTERM');
    await delay(500);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

console.log('validate-browser: ok');

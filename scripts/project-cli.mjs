#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const COMMON_PORTS = [5173, 4173];
const SERVER_DEFAULT_PORTS = {
  dev: 5173,
  preview: 4173,
};

const commands = new Map([
  ['dev', runServerCommand],
  ['preview', runServerCommand],
  ['build', runBuild],
  ['build:ci', runBuildCi],
  ['build:deploy', runBuildDeploy],
  ['check:pwa-sw', (_name, args) => runNodeScript('check-pwa-sw.mjs', args)],
  ['lint', (_name, args) => runPackageBin('eslint', 'bin/eslint.js', ['.', ...args])],
  ['test', runAllTests],
  ['test:rule-engine', (_name, args) => runNodeScript('test-rule-engine.mjs', args)],
  ['test:card-catalog', (_name, args) => runNodeScript('test-card-catalog.mjs', args)],
  ['test:deck', (_name, args) => runNodeScript('test-deck.mjs', args)],
  ['test:gallery-layout', (_name, args) => runNodeScript('test-gallery-layout.mjs', args)],
  ['test:deck-layout', (_name, args) => runNodeScript('test-deck-layout.mjs', args)],
  ['audit:deck-layout', (_name, args) => runNodeScript('audit-deck-layout.mjs', args)],
  ['optimize:images', (_name, args) => runNodeScript('optimize-images.mjs', args)],
  ['split:cards', (_name, args) => runNodeScript('split-cards.mjs', args)],
  ['sync:qa', (_name, args) => runNodeScript('sync-qa.mjs', args)],
  ['cards:manifest', (_name, args) => runNodeScript('generate-card-manifest.mjs', args)],
  ['api:constants', (_name, args) => runNodeScript('generate-api-constants.mjs', args)],
  ['test:share-wall', runShareWallTests],
  ['cf:dev', runCfDev],
  ['d1:migrations:apply:local', (_name, args) => runWrangler(['d1', 'migrations', 'apply', 'DB', '--local', ...args])],
  ['d1:migrations:apply:remote', (_name, args) => runWrangler(['d1', 'migrations', 'apply', 'DB', '--remote', ...args])],
  ['port:check', (_name, args) => checkPorts(args)],
  ['port:clean', (_name, args) => cleanPorts(args)],
]);

async function main() {
  const [commandName, ...args] = process.argv.slice(2);

  if (!commandName || commandName === '--help' || commandName === '-h') {
    printHelp();
    return;
  }

  ensureNodeVersion();

  const command = commands.get(commandName);
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    printHelp();
    process.exit(1);
  }

  const exitCode = await command(commandName, args);
  process.exit(exitCode);
}

function printHelp() {
  console.log(`Usage: node scripts/project-cli.mjs <command> [args]

Commands:
  dev, preview
  build, build:ci, build:deploy, check:pwa-sw
  lint
  test, test:rule-engine, test:card-catalog, test:deck, test:gallery-layout, test:deck-layout
  audit:deck-layout
  optimize:images, split:cards, sync:qa
  cards:manifest, api:constants, test:share-wall [--integration]
  cf:dev, d1:migrations:apply:local, d1:migrations:apply:remote
  port:check [--port <port> ...]
  port:clean [--port <port> ...] [--force]
`);
}

function ensureNodeVersion() {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (major < 20) {
    console.error(`Node.js 20+ is required. Current version: ${process.version}`);
    process.exit(1);
  }
}

async function runServerCommand(commandName, args) {
  const defaultPort = SERVER_DEFAULT_PORTS[commandName];
  const port = readPortArg(args, defaultPort);
  const cleanOk = await ensurePortsAvailable([port], { cleanProjectOwned: true });
  if (!cleanOk) return 1;

  const viteArgs = commandName === 'dev' ? [...args] : ['preview', ...args];
  if (!hasArg(viteArgs, '--strictPort')) {
    viteArgs.push('--strictPort');
  }
  return runPackageBin('vite', 'bin/vite.js', viteArgs);
}

async function runCardsManifest() {
  return runNodeScript('generate-card-manifest.mjs');
}

async function runApiConstants() {
  return runNodeScript('generate-api-constants.mjs');
}

async function runShareWallCodegen() {
  const apiCode = await runApiConstants();
  if (apiCode !== 0) return apiCode;
  return runCardsManifest();
}

function runBuild(_commandName, args) {
  return runBuildWithManifest(args);
}

async function runBuildWithManifest(args) {
  const manifestCode = await runShareWallCodegen();
  if (manifestCode !== 0) return manifestCode;
  return runPackageBin('vite', 'bin/vite.js', ['build', ...args]);
}

async function runBuildCi(_commandName, args) {
  const buildCode = await runBuild('build', args);
  if (buildCode !== 0) return buildCode;
  return runNodeScript('check-pwa-sw.mjs');
}

async function runBuildDeploy(_commandName, args) {
  const buildCode = await runBuild('build', args);
  if (buildCode !== 0) return buildCode;

  const checkCode = await runNodeScript('check-pwa-sw.mjs');
  if (checkCode !== 0) return checkCode;

  return runNodeScript('sync-deploy.mjs');
}

async function runShareWallTests(_commandName, args) {
  const manifestCode = await runShareWallCodegen();
  if (manifestCode !== 0) return manifestCode;
  return runNodeScript('test-share-wall.mjs', args);
}

async function runCfDev(_commandName, args) {
  const buildCode = await runBuildWithManifest(args);
  if (buildCode !== 0) return buildCode;
  return runWrangler(['pages', 'dev', 'dist', ...args]);
}

function runWrangler(args) {
  return runPackageBin('wrangler', 'bin/wrangler.js', args);
}

async function runAllTests() {
  for (const commandName of [
    'test:rule-engine',
    'test:card-catalog',
    'test:deck',
    'test:gallery-layout',
    'test:deck-layout',
    'test:share-wall',
  ]) {
    console.log(`\n> ${commandName}`);
    const code = await commands.get(commandName)(commandName, []);
    if (code !== 0) return code;
  }
  return 0;
}

function runNodeScript(scriptName, args = []) {
  return run(process.execPath, [resolve(projectRoot, 'scripts', scriptName), ...args]);
}

function runPackageBin(packageName, binPath, args = []) {
  const packageBin = resolve(projectRoot, 'node_modules', packageName, binPath);
  if (!existsSync(packageBin)) {
    console.error(`Missing local package binary: ${packageBin}`);
    console.error('Run `npm install` before using project scripts.');
    return 1;
  }
  return run(process.execPath, [packageBin, ...args]);
}

function run(command, args) {
  return new Promise((resolveExit) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      console.error(error);
      resolveExit(1);
    });
    child.on('close', (code, signal) => {
      if (signal) {
        console.error(`Command terminated by ${signal}`);
        resolveExit(1);
        return;
      }
      resolveExit(code ?? 1);
    });
  });
}

function readPortArg(args, fallback) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--port' || arg === '-p') {
      const port = Number.parseInt(args[index + 1], 10);
      return Number.isFinite(port) ? port : fallback;
    }
    if (arg.startsWith('--port=')) {
      const port = Number.parseInt(arg.slice('--port='.length), 10);
      return Number.isFinite(port) ? port : fallback;
    }
  }
  return fallback;
}

function hasArg(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function readPortList(args) {
  const ports = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--port' || arg === '-p') {
      const port = Number.parseInt(args[index + 1], 10);
      if (Number.isFinite(port)) ports.push(port);
      index += 1;
      continue;
    }
    if (arg.startsWith('--port=')) {
      const port = Number.parseInt(arg.slice('--port='.length), 10);
      if (Number.isFinite(port)) ports.push(port);
    }
  }
  return ports.length > 0 ? [...new Set(ports)] : COMMON_PORTS;
}

async function checkPorts(args) {
  const ports = readPortList(args);
  const listeners = getListenersForPorts(ports);
  if (listeners.length === 0) {
    console.log(`Ports available: ${ports.join(', ')}`);
    return 0;
  }

  console.error('Port listeners found:');
  for (const listener of listeners) {
    console.error(formatListener(listener));
  }
  return 1;
}

async function cleanPorts(args) {
  const ports = readPortList(args);
  const force = args.includes('--force');
  const listeners = getListenersForPorts(ports);
  if (listeners.length === 0) {
    console.log(`Ports already available: ${ports.join(', ')}`);
    return 0;
  }

  const blockers = await stopListeners(listeners, {
    allowExternal: force,
    label: `port:clean ${ports.join(', ')}`,
  });
  return blockers.length === 0 ? 0 : 1;
}

async function ensurePortsAvailable(ports, { cleanProjectOwned }) {
  const listeners = getListenersForPorts(ports);
  if (listeners.length === 0) return true;

  if (!cleanProjectOwned) {
    for (const listener of listeners) console.error(formatListener(listener));
    return false;
  }

  const blockers = await stopListeners(listeners, {
    allowExternal: false,
    label: `server port ${ports.join(', ')}`,
  });
  if (blockers.length === 0) return true;

  console.error('\nCannot start local server because these ports are still occupied:');
  for (const listener of blockers) console.error(formatListener(listener));
  console.error('Run `npm run port:clean -- --force` only if those processes are safe to stop.');
  return false;
}

async function stopListeners(listeners, { allowExternal, label }) {
  const blockers = [];
  const owned = [];

  for (const listener of listeners) {
    if (allowExternal || isProjectProcess(listener)) {
      owned.push(listener);
    } else {
      blockers.push(listener);
    }
  }

  if (owned.length > 0) {
    console.log(`Cleaning ${label}:`);
    signalListeners(owned, 'SIGTERM', blockers);
    const ownedPorts = [...new Set(owned.map((listener) => listener.port))];
    const cleared = await waitForPortsToClear(ownedPorts);

    if (!cleared) {
      const stillOwned = getListenersForPorts(ownedPorts).filter((listener) =>
        allowExternal || isProjectProcess(listener),
      );
      if (stillOwned.length > 0) {
        console.log('Escalating stale listeners to SIGKILL:');
        signalListeners(stillOwned, 'SIGKILL', blockers);
        await waitForPortsToClear(ownedPorts);
      }
    }
  }

  const remaining = getListenersForPorts([...new Set(listeners.map((listener) => listener.port))]);
  return [...blockers, ...remaining.filter((listener) => !blockers.some((b) => b.pid === listener.pid))];
}

function signalListeners(listeners, signal, blockers) {
  for (const listener of listeners) {
    console.log(formatListener(listener));
    const result = spawnSync('kill', [`-${signal.replace(/^SIG/, '')}`, String(listener.pid)], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    if (result.status !== 0 && !result.stderr.includes('No such process')) {
      blockers.push(listener);
    }
  }
}

function getListenersForPorts(ports) {
  const listeners = [];
  for (const port of ports) {
    const result = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-FpPc'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    if (result.error?.code === 'ENOENT') {
      console.warn('Skipping port preflight: `lsof` is not available.');
      return [];
    }
    if (result.status !== 0) continue;

    let entry = null;
    for (const line of result.stdout.split('\n')) {
      if (!line) continue;
      const prefix = line[0];
      const value = line.slice(1);
      if (prefix === 'p') {
        if (entry) listeners.push(hydrateListener(entry));
        entry = { port, pid: Number.parseInt(value, 10), command: '' };
      } else if (prefix === 'c' && entry) {
        entry.command = value;
      }
    }
    if (entry) listeners.push(hydrateListener(entry));
  }
  return listeners;
}

function hydrateListener(listener) {
  return {
    ...listener,
    cwd: getProcessCwd(listener.pid),
    commandLine: getProcessCommand(listener.pid),
  };
}

function getProcessCwd(pid) {
  const result = spawnSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) return '';
  const line = result.stdout.split('\n').find((item) => item.startsWith('n'));
  return line ? line.slice(1) : '';
}

function getProcessCommand(pid) {
  const result = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function isProjectProcess(listener) {
  if (!listener.cwd) return false;
  const pathFromRoot = relative(projectRoot, listener.cwd);
  return pathFromRoot === '' || (!pathFromRoot.startsWith('..') && !pathFromRoot.includes(`..${sep}`));
}

function formatListener(listener) {
  const cwd = listener.cwd ? ` cwd=${listener.cwd}` : '';
  const command = listener.commandLine || listener.command;
  return `  :${listener.port} pid=${listener.pid} command="${command}"${cwd}`;
}

async function waitForPortsToClear(ports) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
    if (getListenersForPorts(ports).length === 0) return true;
  }
  return false;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

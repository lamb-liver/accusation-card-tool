import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function getCandidateNodePaths() {
  return unique([
    process.env.PROJECT_NODE_PATH,
    process.execPath,
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
  ]);
}

export function canImportWithNode(nodePath, specifier, cwd) {
  if (!nodePath || !existsSync(nodePath)) return false;
  const source = `import(${JSON.stringify(specifier)})
    .then(() => {})
    .catch(() => process.exit(1));`;
  const result = spawnSync(nodePath, ['-e', source], {
    cwd,
    encoding: 'utf8',
    stdio: 'ignore',
  });
  return result.status === 0;
}

export function resolveNodeForPackageBin(projectRoot, packageName) {
  if (process.env.PROJECT_NODE_PATH && existsSync(process.env.PROJECT_NODE_PATH)) {
    return process.env.PROJECT_NODE_PATH;
  }

  if (packageName !== 'vite') return process.execPath;

  for (const nodePath of getCandidateNodePaths()) {
    if (canImportWithNode(nodePath, 'rolldown', projectRoot)) return nodePath;
  }

  return process.execPath;
}

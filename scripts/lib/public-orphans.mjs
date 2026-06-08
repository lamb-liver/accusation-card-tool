import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import {
  collectRequiredPublicAssets,
  expectedPrecompressedCardShardPaths,
} from './public-assets.mjs';

function walkFiles(rootDir) {
  const out = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolutePath = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        out.push(absolutePath);
      }
    }
  };
  visit(rootDir);
  return out;
}

function classifyPath(path, { required, precompressed }) {
  const baseName = path.split('/').pop();

  if (required.has(path)) {
    return { bucket: 'required', reason: 'current asset reference chain' };
  }

  if (precompressed.has(path)) {
    return { bucket: 'keep', reason: 'precompressed card shard for static serving' };
  }

  if (baseName === '.DS_Store') {
    return { bucket: 'safeRemove', reason: 'OS metadata' };
  }

  if (/^public\/images\/.+-w(?:200|400|800)\.(?:webp|avif)$/i.test(path)) {
    return { bucket: 'safeRemove', reason: 'stale responsive card size not used by current URL rules' };
  }

  if (/^public\/images\/icons\/.+(?:\.png|-32\.avif)$/i.test(path)) {
    return { bucket: 'review', reason: 'icon source/generated variant not referenced by current UI' };
  }

  return { bucket: 'review', reason: 'not referenced by current asset rules' };
}

export function getPublicOrphanReport(projectRoot) {
  const publicRoot = resolve(projectRoot, 'public');
  const { required, failures, cards } = collectRequiredPublicAssets(projectRoot);
  const precompressed = new Set(expectedPrecompressedCardShardPaths(required));
  const buckets = {
    required: [],
    keep: [],
    safeRemove: [],
    review: [],
  };

  for (const absolutePath of walkFiles(publicRoot)) {
    const rel = relative(projectRoot, absolutePath).split(sep).join('/');
    const stats = statSync(absolutePath);
    const classified = classifyPath(rel, { required, precompressed });
    buckets[classified.bucket].push({
      path: rel,
      reason: classified.reason,
      bytes: stats.size,
    });
  }

  return {
    failures,
    cards,
    required,
    precompressed,
    buckets,
  };
}

export function summarizeBytes(items) {
  return items.reduce((total, item) => total + item.bytes, 0);
}

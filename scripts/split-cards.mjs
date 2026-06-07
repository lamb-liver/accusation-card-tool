import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'public/cards.json');
const OUT_DIR = resolve(ROOT, 'public/cards');

const SHARD_KEYS = ['cro', 'fox', 'dor', 'asy', 'exi'];

function shardKey(id) {
  const match = /^[a-z]+/i.exec(id);
  return match?.[0] ?? 'misc';
}

const all = JSON.parse(readFileSync(SRC, 'utf8'));
if (!Array.isArray(all)) throw new Error('cards.json must be an array');

mkdirSync(OUT_DIR, { recursive: true });

const groups = Object.fromEntries(SHARD_KEYS.map((k) => [k, []]));

for (const card of all) {
  const key = shardKey(card.id);
  if (!groups[key]) groups[key] = [];
  groups[key].push(card);
}

const shards = SHARD_KEYS.filter((k) => groups[k]?.length).map((key) => {
  const path = `/cards/${key}.json`;
  writeFileSync(resolve(OUT_DIR, `${key}.json`), JSON.stringify(groups[key]));
  return { key, path, count: groups[key].length };
});

writeFileSync(
  resolve(OUT_DIR, 'index.json'),
  JSON.stringify({ version: 1, total: all.length, shards }, null, 2),
);

console.log('split cards:', shards.map((s) => `${s.key}=${s.count}`).join(', '));

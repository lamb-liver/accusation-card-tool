import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { brotliCompressSync, gzipSync, constants as zlib } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'public/cards.json');
const OUT_DIR = resolve(ROOT, 'public/cards');

/** 分片順序即載入順序：cro 必須是第一分片（index.html 的 LCP 預載指向 cro01） */
const SHARD_KEYS = ['cro', 'fox', 'dor', 'asy', 'exi', 'mot', 'kit'];
/** index.json 結構版本；僅在分片格式變更時遞增 */
const INDEX_VERSION = 4;

function shardKey(id) {
  const match = /^[a-z]+/i.exec(id);
  return match?.[0] ?? '';
}

const all = JSON.parse(readFileSync(SRC, 'utf8'));
if (!Array.isArray(all)) throw new Error('cards.json must be an array');

mkdirSync(OUT_DIR, { recursive: true });

const groups = Object.fromEntries(SHARD_KEYS.map((k) => [k, []]));

for (const card of all) {
  const key = shardKey(card.id);
  if (!groups[key]) {
    throw new Error(
      `card "${card.id}" 的前綴 "${key}" 不在 SHARD_KEYS 中 — 新增教團時需同步更新 scripts/split-cards.mjs`,
    );
  }
  groups[key].push(card);
}

/** 靜態伺服器優先供應 .br/.gz，必須與 .json 同步重建，否則會供應過期資料 */
function writeShardWithPrecompressed(filePath, json) {
  const buf = Buffer.from(json);
  writeFileSync(filePath, buf);
  writeFileSync(`${filePath}.br`, brotliCompressSync(buf, {
    params: { [zlib.BROTLI_PARAM_QUALITY]: 11 },
  }));
  writeFileSync(`${filePath}.gz`, gzipSync(buf, { level: 9 }));
}

const shards = SHARD_KEYS.filter((k) => groups[k].length).map((key) => {
  const path = `/cards/${key}.json`;
  writeShardWithPrecompressed(resolve(OUT_DIR, `${key}.json`), JSON.stringify(groups[key]));
  return { key, path, count: groups[key].length };
});

writeFileSync(
  resolve(OUT_DIR, 'index.json'),
  JSON.stringify({ version: INDEX_VERSION, total: all.length, shards }, null, 2),
);

console.log('split cards:', shards.map((s) => `${s.key}=${s.count}`).join(', '));

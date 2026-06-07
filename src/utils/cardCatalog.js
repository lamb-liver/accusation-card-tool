/** @typedef {{ version: number, shards: { path: string, key?: string, count?: number }[] }} CardCatalogIndex */

const INDEX_PATH = '/cards/index.json';

const DB_NAME = 'accusation-cards-v1';
const DB_VERSION = 1;
const STORE = 'shards';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

function getStore(db, mode = 'readonly') {
  return db.transaction(STORE, mode).objectStore(STORE);
}

/**
 * @returns {Promise<CardCatalogIndex | null>}
 */
async function readCachedIndex() {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = getStore(db).get('__index__');
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * @param {CardCatalogIndex} index
 * @returns {Promise<object[] | null>}
 */
async function loadMergedFromStoredIndex(index) {
  if (typeof indexedDB === 'undefined') return null;
  const shardList = index.shards ?? [];
  if (!Array.isArray(shardList) || shardList.length === 0) return null;

  try {
    const db = await openDb();
    const parts = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const results = new Array(shardList.length);
      let pending = shardList.length;

      shardList.forEach(({ path }, i) => {
        const req = store.get(path);
        req.onsuccess = () => {
          results[i] = req.result;
          if (--pending === 0) resolve(results);
        };
        req.onerror = () => reject(req.error);
      });
      tx.onerror = () => reject(tx.error);
    });

    if (parts.some((p) => !Array.isArray(p))) return null;
    return parts.flat();
  } catch {
    return null;
  }
}

/**
 * @param {CardCatalogIndex} index 遠端 index（用於 version 比對）
 * @returns {Promise<object[] | null>}
 */
async function loadMergedFromVersionCache(index) {
  const cachedIndex = await readCachedIndex();
  if (!cachedIndex || cachedIndex.version !== index.version) return null;
  return loadMergedFromStoredIndex(cachedIndex);
}

/**
 * @param {CardCatalogIndex} index
 * @param {Map<string, object[]>} shardsByPath
 */
async function writeCatalogCache(index, shardsByPath) {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.put(index, '__index__');
      for (const [path, data] of shardsByPath) {
        store.put(data, path);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB 寫入失敗:', err);
  }
}

/**
 * @param {typeof fetch} fetchFn
 * @returns {Promise<CardCatalogIndex>}
 */
async function fetchCatalogIndex(fetchFn) {
  const indexRes = await fetchFn(INDEX_PATH);
  if (!indexRes.ok) throw new Error(`index HTTP ${indexRes.status}`);
  return indexRes.json();
}

/**
 * @param {CardCatalogIndex} index
 * @param {typeof fetch} fetchFn
 * @returns {Promise<{ merged: object[], shardsByPath: Map<string, object[]> }>}
 */
async function fetchAndMergeShards(index, fetchFn, { onFirstShard } = {}) {
  const shardList = index.shards ?? [];
  if (!Array.isArray(shardList) || shardList.length === 0) {
    throw new Error('cards index has no shards');
  }

  const shardsByPath = new Map();

  if (onFirstShard && shardList[0]?.path) {
    const firstPath = shardList[0].path;
    const firstRes = await fetchFn(firstPath);
    if (!firstRes.ok) throw new Error(`shard HTTP ${firstRes.status}: ${firstPath}`);
    const firstData = await firstRes.json();
    shardsByPath.set(firstPath, firstData);
    onFirstShard(firstData);
  }

  const rest = onFirstShard && shardList[0]?.path ? shardList.slice(1) : shardList;
  const restParts = await Promise.all(
    rest.map(async ({ path }) => {
      const res = await fetchFn(path);
      if (!res.ok) throw new Error(`shard HTTP ${res.status}: ${path}`);
      const data = await res.json();
      shardsByPath.set(path, data);
      return data;
    }),
  );

  const firstPart =
    onFirstShard && shardList[0]?.path ? shardsByPath.get(shardList[0].path) : null;
  const parts = firstPart ? [firstPart, ...restParts] : restParts;

  const merged = parts.flat();
  if (!Array.isArray(merged) || merged.length === 0) {
    console.warn('警告：卡牌資料為空或格式不正確');
  }

  return { merged, shardsByPath };
}

/**
 * 載入完整卡牌目錄：IndexedDB 快取優先，僅在 version 變更時抓取分片。
 *
 * @param {object} [options]
 * @param {(cards: object[]) => void} [options.onUpdate] 每次有可顯示的卡牌時呼叫（可能多次）
 * @param {() => void} [options.onCacheMiss] 尚無任何可顯示快取、即將發起網路請求前呼叫
 * @param {typeof fetch} [options.fetch] 可注入 fetch（測試用）
 * @returns {Promise<{ unchanged: boolean, hadDisplayableCache: boolean }>}
 *   `unchanged`：已有快取且遠端 version 相同，未再抓分片
 */
export async function loadCardCatalog(options = {}) {
  const { onUpdate, onCacheMiss, fetch: fetchFn = fetch } = options;

  let hadDisplayableCache = false;
  const storedIndex = await readCachedIndex();

  if (storedIndex) {
    const cached = await loadMergedFromStoredIndex(storedIndex);
    if (cached?.length) {
      onUpdate?.(cached);
      hadDisplayableCache = true;
    }
  }

  if (!hadDisplayableCache) {
    onCacheMiss?.();
  }

  const index = await fetchCatalogIndex(fetchFn);

  if (hadDisplayableCache && storedIndex?.version === index.version) {
    return { unchanged: true, hadDisplayableCache: true };
  }

  const versionCached = await loadMergedFromVersionCache(index);
  if (versionCached?.length) {
    onUpdate?.(versionCached);
    hadDisplayableCache = true;
  }

  const { merged, shardsByPath } = await fetchAndMergeShards(index, fetchFn, {
    onFirstShard:
      hadDisplayableCache
        ? undefined
        : (data) => {
            if (Array.isArray(data) && data.length > 0) onUpdate?.(data);
          },
  });
  onUpdate?.(merged);
  await writeCatalogCache(index, shardsByPath);

  return { unchanged: false, hadDisplayableCache };
}

export { INDEX_PATH };

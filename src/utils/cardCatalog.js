/** @typedef {{ version: number, shards: { path: string, key?: string, count?: number }[] }} CardCatalogIndex */

const INDEX_PATH = '/cards/index.json';

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
 * @returns {Promise<object[]>}
 */
async function fetchAndMergeShards(index, fetchFn) {
  const shardList = index.shards ?? [];
  if (!Array.isArray(shardList) || shardList.length === 0) {
    throw new Error('cards index has no shards');
  }

  const parts = await Promise.all(
    shardList.map(async ({ path }) => {
      const res = await fetchFn(path);
      if (!res.ok) throw new Error(`shard HTTP ${res.status}: ${path}`);
      return res.json();
    }),
  );

  const merged = parts.flat();
  if (!Array.isArray(merged) || merged.length === 0) {
    console.warn('警告：卡牌資料為空或格式不正確');
  }

  return merged;
}

/**
 * 載入完整卡牌目錄。瀏覽器快取與 Workbox 已處理重複請求。
 *
 * @param {object} [options]
 * @param {(cards: object[]) => void} [options.onUpdate]
 * @param {() => void} [options.onCacheMiss]
 * @param {typeof fetch} [options.fetch] 可注入 fetch（測試用）
 * @returns {Promise<{ unchanged: boolean, hadDisplayableCache: boolean }>}
 */
export async function loadCardCatalog(options = {}) {
  const { onUpdate, onCacheMiss, fetch: fetchFn = fetch } = options;

  onCacheMiss?.();
  const index = await fetchCatalogIndex(fetchFn);
  const merged = await fetchAndMergeShards(index, fetchFn);
  onUpdate?.(merged);

  return { unchanged: false, hadDisplayableCache: false };
}

export { INDEX_PATH };

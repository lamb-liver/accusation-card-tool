export const CARD_CATALOG_PATH = '/cards.json';

/**
 * 載入完整卡牌目錄。瀏覽器與 Workbox 處理重複請求。
 *
 * @param {object} [options]
 * @param {typeof fetch} [options.fetch] 可注入 fetch（測試用）
 * @returns {Promise<object[]>}
 */
export async function loadCardCatalog({ fetch: fetchFn = fetch } = {}) {
  const response = await fetchFn(CARD_CATALOG_PATH);
  if (!response.ok) throw new Error(`cards HTTP ${response.status}`);
  const cards = await response.json();
  if (!Array.isArray(cards) || cards.length === 0) {
    console.warn('警告：卡牌資料為空或格式不正確');
    return [];
  }
  return cards;
}

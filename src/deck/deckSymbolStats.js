import { FILTER_OPTIONS } from '../constants/filterOptions.js';

/** @import { Deck } from '../types.js' */

/**
 * 符號的顯示順序：沿用篩選下拉的順序，讓玩家在兩處看到同一排列。
 * 'all' 是篩選器的哨兵值，不是真的符號。
 */
export const SYMBOL_ORDER = FILTER_OPTIONS.symbol
  .map((option) => option.value)
  .filter((value) => value !== 'all');

/**
 * 統計牌組內各符號的**總數**。
 *
 * 必須逐一累加而非「含此符號的卡數」：一張卡可以提供多個同符號
 * （例：稻原的 symbols 是 ['自然','自然','夜幕']，提供 2 個自然），
 * 而卡牌效果的 `(4*凋零)` 語法算的正是符號總數。
 *
 * ## 已確認的規則（2026-07，向專案維護者確認）
 *
 * - 效果文本的「你擁有(N*符號)」**以場上為準**，不是手牌或牌庫。
 * - 教主、儀式、信徒、地點放在場上時**都提供**自身符號；魔法卡一律無符號。
 *   儀式雖然是條件的檢查者，本身在場上仍計入符號。
 * - 儀式卡的 `symbols` 是它自身的符號，**與效果要求的符號無關**——例如狐嫁夜
 *   的 symbols 是 ['夜幕']，效果要求的卻是「5*野性」。不可把 symbols 當成需求。
 *
 * 因此本函式涵蓋教主／儀式／主牌組三個欄位。得到的是「牌組內的符號上限」：
 * 主牌組要抽到並打出才會上場，故此數字**不等於**對局中任一時點的實際擁有數，
 * UI 需據實標示，避免玩家把它誤讀成判定值。
 *
 * @param {Deck} deck
 * @param {string[]} [order] 顯示順序，預設 SYMBOL_ORDER
 * @returns {{ symbol: string, count: number }[]} 只含 count > 0 者，依 order 排列；
 *   order 未涵蓋的符號（資料新增了符號但常數未更新）接在最後，不會被靜默丟棄
 */
export function collectDeckSymbolCounts(deck, order = SYMBOL_ORDER) {
  const counts = new Map();

  for (const card of [...deck.leader, ...deck.rituals, ...deck.main]) {
    if (!Array.isArray(card?.symbols)) continue;
    for (const symbol of card.symbols) {
      if (typeof symbol !== 'string' || symbol === '') continue;
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    }
  }

  const ordered = [];
  for (const symbol of order) {
    const count = counts.get(symbol) ?? 0;
    if (count > 0) ordered.push({ symbol, count });
    counts.delete(symbol);
  }
  for (const [symbol, count] of counts) {
    ordered.push({ symbol, count });
  }

  return ordered;
}

/**
 * @param {Deck} deck
 * @returns {number} 牌組內符號總數（所有符號加總）
 */
export function getTotalSymbolCount(deck) {
  return collectDeckSymbolCounts(deck).reduce((sum, entry) => sum + entry.count, 0);
}

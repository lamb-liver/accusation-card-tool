import { qaData } from '../data/qaData.js';
import { isPlaceholderOnlyCategory } from '../constants/qaPlaceholder.js';

/**
 * 該教團是否有真正的 QA 內容（排除佔位題）。
 * 用於決定卡片彈窗是否顯示「查看此教團 QA」，避免把玩家帶到空分類。
 * @param {string | undefined} faction
 */
export function factionHasQA(faction) {
  if (!faction) return false;
  const category = qaData.find((item) => item.category === faction);
  return Boolean(category) && !isPlaceholderOnlyCategory(category);
}

import { qaData } from '../data/qaData.js';

/** 與 scripts/sync-qa.mjs 的 PLACEHOLDER 一致：分頁尚未建立時的佔位題 */
const PLACEHOLDER_Q = '目前尚無特定 QA';

/**
 * 該教團是否有真正的 QA 內容（排除佔位題）。
 * 用於決定卡片彈窗是否顯示「查看此教團 QA」，避免把玩家帶到空分類。
 * @param {string | undefined} faction
 */
export function factionHasQA(faction) {
  if (!faction) return false;
  const category = qaData.find((item) => item.category === faction);
  return Boolean(category?.questions.some((qa) => qa.q !== PLACEHOLDER_Q));
}

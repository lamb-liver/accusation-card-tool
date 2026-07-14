import { normalizeRuleShape } from '../../shared/deckCompositionCore.js';

/** @typedef {'rule1'|'rule2'} RuleType */
/** @typedef {import('../types.js').DeckRule} DeckRule */

export const EMPTY_RULE = {
  isActive: false,
  type: 'rule1',
  primary: '',
  secondary: '',
};

/**
 * 前端編輯狀態的規則正規化：缺 isActive 預設未啟用、
 * rule1 保留 secondary（切回 rule2 不丟失選擇）。
 * 驗證路徑請用 shared 的 normalizeRuleForComposition。
 * @param {Partial<DeckRule> | null | undefined} rule
 * @returns {DeckRule}
 */
export function normalizeRule(rule) {
  return normalizeRuleShape(rule, { missingIsActive: false, keepRule1Secondary: true });
}

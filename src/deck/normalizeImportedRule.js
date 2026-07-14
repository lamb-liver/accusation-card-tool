import { normalizeRule } from '../rules/normalizeRule.js';

/** @typedef {import('../types.js').DeckRule} DeckRule */

/**
 * 正規化匯入／已存牌組的 rule 物件（與 JSON 匯入契約一致）。
 * 語意與前端編輯狀態相同，委派 normalizeRule 單一實作。
 * @param {Partial<DeckRule> | null | undefined} rule
 * @returns {DeckRule}
 */
export function normalizeImportedRule(rule) {
  return normalizeRule(rule);
}

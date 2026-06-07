import { VALID_RULE_TYPES } from './constants.js';

/** @typedef {import('../types.js').DeckRule} DeckRule */

/**
 * 正規化匯入／已存牌組的 rule 物件（與 JSON 匯入契約一致）。
 * @param {Partial<DeckRule> | null | undefined} rule
 * @returns {DeckRule}
 */
export function normalizeImportedRule(rule) {
  return {
    isActive: Boolean(rule?.isActive),
    type: VALID_RULE_TYPES.includes(rule?.type) ? rule.type : 'rule1',
    primary: typeof rule?.primary === 'string' ? rule.primary : '',
    secondary: typeof rule?.secondary === 'string' ? rule.secondary : '',
  };
}

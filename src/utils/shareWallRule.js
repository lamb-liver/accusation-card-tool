import { normalizeRuleShape } from '../../shared/deckCompositionCore.js';

/** @typedef {import('../types.js').DeckRule} DeckRule */

/**
 * @param {DeckRule} rule
 */
export function ruleToApiPayload(rule) {
  return {
    type: rule.type,
    primary: rule.primary,
    secondary: rule.type === 'rule2' ? rule.secondary : '',
  };
}

/**
 * API rule_json → DeckRule：分享牆的規則存在即視為啟用。
 * 形狀處理委派 shared 單一實作。
 * @param {Partial<DeckRule> | null | undefined} ruleJson
 * @returns {DeckRule}
 */
export function apiRuleToDeckRule(ruleJson) {
  return { ...normalizeRuleShape(ruleJson), isActive: true };
}

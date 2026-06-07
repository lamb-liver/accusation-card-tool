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
 * @param {Partial<DeckRule> | null | undefined} ruleJson
 * @returns {DeckRule}
 */
export function apiRuleToDeckRule(ruleJson) {
  const type = ruleJson?.type === 'rule2' ? 'rule2' : 'rule1';
  return {
    isActive: true,
    type,
    primary: typeof ruleJson?.primary === 'string' ? ruleJson.primary : '',
    secondary: type === 'rule2' && typeof ruleJson?.secondary === 'string' ? ruleJson.secondary : '',
  };
}

/** @typedef {'rule1'|'rule2'} RuleType */
/** @typedef {import('../types.js').DeckRule} DeckRule */

export const EMPTY_RULE = {
  isActive: false,
  type: 'rule1',
  primary: '',
  secondary: '',
};

/**
 * @param {Partial<DeckRule> | null | undefined} rule
 * @returns {DeckRule}
 */
export function normalizeRule(rule) {
  if (!rule || typeof rule !== 'object') return { ...EMPTY_RULE };
  return {
    isActive: Boolean(rule.isActive),
    type: rule.type === 'rule2' ? 'rule2' : 'rule1',
    primary: typeof rule.primary === 'string' ? rule.primary : '',
    secondary: typeof rule.secondary === 'string' ? rule.secondary : '',
  };
}

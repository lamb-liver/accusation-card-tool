export const EMPTY_DECK = { leader: [], rituals: [], main: [] };
/** 單一定義位於 rules/normalizeRule.js；此處轉出口維持既有 import 路徑 */
export { EMPTY_RULE } from '../rules/normalizeRule.js';

export const STORAGE_KEY = 'accusation_deck_v2';
export const SAVED_DECKS_KEY = 'accusation_saved_decks_v2';
export const RULE_STATE_KEY = 'accusation_rule_state_v2';

export const MAX_SAVED_DECKS = 10;
export const VALID_RULE_TYPES = ['rule1', 'rule2'];

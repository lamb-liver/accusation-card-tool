/**
 * 構築規則模組（兩個 interface）：
 * - deckPoolDisplay：展示篩選（組牌池／計數）
 * - deckBuildValidity：組牌合法性（加入決策、教主／儀式）
 *
 * 牌組結構限制（張數、欄位、重複）見 deck/rules.js。
 */

export { EMPTY_RULE, normalizeRule } from './normalizeRule.js';
export {
  isCardAllowedInRulePool,
  filterCardsByRule,
  sortCardsForRuleDisplay,
} from './deckPoolDisplay.js';
export { getMainDeckFactionDecision, checkSpecialCardFaction } from './deckBuildValidity.js';

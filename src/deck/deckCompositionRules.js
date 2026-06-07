import { normalizeRule } from '../rules/normalizeRule.js';
import {
  DECK_COMPOSITION_LIMITS,
  collectDeckStructureViolations,
  getMainDeckFactionViolation,
  getRule2MainQuotaViolations,
} from '../../shared/deckCompositionCore.js';

/** @import { Card, Deck, DeckRule } from '../types.js' */

export const DECK_LIMITS = DECK_COMPOSITION_LIMITS;

export { collectDeckStructureViolations, getMainDeckFactionViolation, getRule2MainQuotaViolations };

/**
 * 若加入此卡是否會超過 rule2 配額（單卡加入檢查）。
 * @param {Card} card
 * @param {Deck} deck
 * @param {DeckRule} rule
 * @returns {string | null}
 */
export function getRule2QuotaBlockReasonForAdd(card, deck, rule) {
  const normalizedRule = normalizeRule(rule);
  if (
    !normalizedRule.isActive ||
    normalizedRule.type !== 'rule2' ||
    !normalizedRule.secondary ||
    card.type === '教主' ||
    card.type === '儀式' ||
    card.faction === '放逐者'
  ) {
    return null;
  }

  const primaryCount = deck.main.filter((c) => c.faction === normalizedRule.primary).length;
  const secondaryCount = deck.main.filter((c) => c.faction === normalizedRule.secondary).length;

  if (card.faction === normalizedRule.primary && primaryCount >= DECK_LIMITS.rule2PrimaryMain) {
    return `${normalizedRule.primary} 已達 12 張上限`;
  }
  if (card.faction === normalizedRule.secondary && secondaryCount >= DECK_LIMITS.rule2SecondaryMain) {
    return `${normalizedRule.secondary} 已達 8 張上限`;
  }
  return null;
}

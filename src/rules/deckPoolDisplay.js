import { normalizeRule } from './normalizeRule.js';

/** @import { Card, DeckRule } from '../types.js' */

/**
 * 展示篩選：卡牌是否可出現在組牌池／計數列表中。
 * @param {Card} card
 * @param {DeckRule} rule
 */
export function isCardAllowedInRulePool(card, rule) {
  const normalizedRule = normalizeRule(rule);
  if (!normalizedRule.isActive) return true;
  if (card.faction === '放逐者') return true;

  if (normalizedRule.type === 'rule1') {
    return card.faction === normalizedRule.primary;
  }

  if (card.faction === normalizedRule.primary) return true;
  if (card.faction === normalizedRule.secondary) {
    return card.type !== '教主' && card.type !== '儀式';
  }

  return false;
}

/**
 * @param {Card[]} cards
 * @param {DeckRule} rule
 * @returns {Card[]}
 */
export function filterCardsByRule(cards, rule) {
  if (!Array.isArray(cards) || cards.length === 0) return [];
  const normalizedRule = normalizeRule(rule);
  if (!normalizedRule.isActive) return cards;
  return cards.filter((card) => isCardAllowedInRulePool(card, normalizedRule));
}

/**
 * rule2 組牌池排序：主教團 → 次要教團（無教主／儀式）→ 放逐者。
 * @param {Card[]} cards
 * @param {DeckRule} rule
 * @returns {Card[]}
 */
export function sortCardsForRuleDisplay(cards, rule) {
  if (!Array.isArray(cards) || cards.length <= 1) return cards;
  const normalizedRule = normalizeRule(rule);
  if (!normalizedRule.isActive || normalizedRule.type !== 'rule2') return cards;

  const { primary, secondary } = normalizedRule;
  const order = {
    [primary]: 0,
    ...(secondary ? { [secondary]: 1 } : {}),
    放逐者: secondary ? 2 : 1,
  };

  return [...cards].sort((a, b) => (order[a.faction] ?? 3) - (order[b.faction] ?? 3));
}

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
 * 教團排序階層的單一定義：主教團 → 次要教團 → 放逐者（中立）。
 * 組牌池顯示與主牌組排序共用，避免兩處各自維護而失同步。
 *
 * 不在此階層中的教團回傳 undefined，由呼叫端以 `??` 決定後備名次
 * （避免用魔術數字當哨兵，也不會與真實名次混淆）。
 *
 * @param {DeckRule} rule 已正規化或未正規化皆可
 * @returns {(faction: string) => number | undefined}
 */
export function factionRankForRule(rule) {
  const { primary, secondary } = normalizeRule(rule);
  const order = new Map();
  let next = 0;
  if (primary) order.set(primary, next++);
  if (secondary && secondary !== primary) order.set(secondary, next++);
  // 放逐者緊接主／副之後；未設定主副時不佔位，交由呼叫端的後備決定
  if (next > 0) order.set('放逐者', next++);

  return (faction) => order.get(faction);
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

  const rank = factionRankForRule(normalizedRule);
  return [...cards].sort((a, b) => (rank(a.faction) ?? 3) - (rank(b.faction) ?? 3));
}

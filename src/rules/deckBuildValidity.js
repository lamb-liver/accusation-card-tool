import { normalizeRule } from './normalizeRule.js';

/** @import { Card, DeckRule } from '../types.js' */

/**
 * 組牌合法性：主牌組加入時的教團決策（對話框／拒絕）。
 * @param {Card} card
 * @param {DeckRule} rule
 */
export function getMainDeckFactionDecision(card, rule) {
  const normalizedRule = normalizeRule(rule);

  if (!normalizedRule.isActive) {
    return { kind: 'allow' };
  }

  if (normalizedRule.type === 'rule2' && !normalizedRule.secondary && card.faction !== normalizedRule.primary) {
    return { kind: 'ask_secondary' };
  }

  if (normalizedRule.type === 'rule2' && normalizedRule.secondary && card.faction !== '放逐者') {
    if (card.faction !== normalizedRule.primary && card.faction !== normalizedRule.secondary) {
      return { kind: 'deny', reason: '不能加入第三教團的牌' };
    }
  }

  if (normalizedRule.type === 'rule1' && card.faction !== normalizedRule.primary && card.faction !== '放逐者') {
    return { kind: 'deny', reason: `主牌組只能使用「${normalizedRule.primary}」的卡牌` };
  }

  return { kind: 'allow' };
}

/**
 * 教主／儀式必須屬於主要教團。
 * @param {Card} card
 * @param {DeckRule} rule
 * @returns {string | null} 錯誤訊息；通過則 null
 */
export function checkSpecialCardFaction(card, rule) {
  const normalizedRule = normalizeRule(rule);
  if (card.faction !== normalizedRule.primary) return `${card.type}必須與主要教團相同`;
  return null;
}

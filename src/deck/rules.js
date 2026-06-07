import { checkSpecialCardFaction, getMainDeckFactionDecision } from '../rules/deckBuildValidity.js';
import {
  collectDeckStructureViolations,
  DECK_LIMITS,
  getRule2QuotaBlockReasonForAdd,
} from './deckCompositionRules.js';

export function getDeckTotal(deck) {
  return deck.leader.length + deck.rituals.length + deck.main.length;
}

export function checkMainCapacity(deck) {
  const total = getDeckTotal(deck);
  if (total >= DECK_LIMITS.maxTotal) return '牌組已滿（最多 24 張）';
  if (deck.main.length >= DECK_LIMITS.maxMain) return '主牌組已滿（最多 20 張）';
  return null;
}

/** @deprecated 與 checkMainCapacity 相同；保留相容性 */
export function checkNeutralCapacity(deck) {
  return checkMainCapacity(deck);
}

/**
 * 單卡加入阻擋原因（controller 與組牌池 UI 共用）。
 * @param {import('../types.js').Card} card
 * @param {import('../types.js').Deck} targetDeck
 * @param {import('../types.js').DeckRule} targetRule
 */
export function getAddBlockReason(card, targetDeck, targetRule) {
  const allIds = [...targetDeck.leader, ...targetDeck.rituals, ...targetDeck.main].map((c) => c.id);

  if (allIds.includes(card.id)) return { blocked: true, reason: '此卡已在牌組中' };
  if (card.type === '教主' && targetDeck.leader.length >= DECK_LIMITS.maxLeader) {
    return { blocked: true, reason: '教主欄位已滿（上限 1 張）' };
  }
  if (card.type === '儀式' && targetDeck.rituals.length >= DECK_LIMITS.maxRituals) {
    return { blocked: true, reason: '儀式欄位已滿（上限 3 張）' };
  }

  if (targetRule.isActive) {
    if (card.type === '教主' || card.type === '儀式') {
      const specialErr = checkSpecialCardFaction(card, targetRule);
      if (specialErr) return { blocked: true, reason: specialErr };
    } else {
      const factionDecision = getMainDeckFactionDecision(card, targetRule);
      if (factionDecision.kind === 'deny') {
        return { blocked: true, reason: factionDecision.reason };
      }
    }
  }

  const quotaErr = getRule2QuotaBlockReasonForAdd(card, targetDeck, targetRule);
  if (quotaErr) return { blocked: true, reason: quotaErr };

  if (card.type !== '教主' && card.type !== '儀式') {
    const capErr = checkMainCapacity(targetDeck);
    if (capErr) return { blocked: true, reason: capErr };
  }

  return { blocked: false, reason: '' };
}

/**
 * 組牌池中應禁用「加入」的卡牌 id（與 getAddBlockReason 同源）。
 * @param {import('../types.js').Deck} deck
 * @param {import('../types.js').DeckRule} rule
 * @param {import('../types.js').Card[]} cards
 * @returns {Set<string>}
 */
export function getPoolBlockedCardIds(deck, rule, cards) {
  const blocked = new Set();
  for (const card of cards) {
    if (getAddBlockReason(card, deck, rule).blocked) {
      blocked.add(card.id);
    }
  }
  return blocked;
}

export function getFactionAutoFill(allCards, faction) {
  const leaderCard = allCards.find((c) => c.faction === faction && c.type === '教主');
  const ritualCards = allCards.filter((c) => c.faction === faction && c.type === '儀式').slice(0, 3);
  return { leaderCard, ritualCards };
}

/**
 * 匯入／載入後檢查牌組結構是否符合構築上限（不修改資料）。
 * @param {import('../types.js').Deck} deck
 * @param {import('../types.js').DeckRule} [rule]
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateDeckComposition(deck, rule) {
  const issues = collectDeckStructureViolations(deck, rule);
  return {
    valid: issues.length === 0,
    reason: issues.join('；'),
  };
}

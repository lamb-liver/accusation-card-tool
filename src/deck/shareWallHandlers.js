import { submitPublicDeck } from '../api/shareWallApi.js';
import { createDeckFromJsonIds } from './importExport.js';
import { validateDeckComposition } from './rules.js';
import { apiRuleToDeckRule, ruleToApiPayload } from '../utils/shareWallRule.js';
import { validateApiDeckJson, validateApiRuleJson } from '../utils/shareWallShape.js';

/** @import { Card, Deck, DeckRule } from '../types.js' */

/**
 * @param {Deck} deck
 * @param {DeckRule} currentRule
 * @param {(message: string, type?: string) => void} showToast
 * @returns {boolean}
 */
export function canSubmitDeckToShareWall(deck, currentRule, showToast) {
  if (!currentRule.isActive || !currentRule.primary) {
    showToast('請先設定並套用構築規則', 'warning');
    return false;
  }

  const composition = validateDeckComposition(deck, currentRule);
  if (!composition.valid) {
    showToast(`無法投稿：${composition.reason}`, 'error');
    return false;
  }

  return true;
}

/**
 * @param {Deck} deck
 * @param {DeckRule} currentRule
 * @param {{ title: string, author_name: string, description: string }} form
 */
export async function submitDeckShareForm(deck, currentRule, form) {
  return submitPublicDeck({
    title: form.title,
    author_name: form.author_name,
    description: form.description,
    deck_json: {
      leader: deck.leader.map((card) => card.id),
      rituals: deck.rituals.map((card) => card.id),
      main: deck.main.map((card) => card.id),
    },
    rule_json: ruleToApiPayload(currentRule),
    ...(form.turnstile_token ? { turnstile_token: form.turnstile_token } : {}),
  });
}

/**
 * @param {{
 *   deckJson: unknown,
 *   ruleJson: unknown,
 *   allCards: Card[],
 *   applyShareWallLoad: (deck: Deck, rule: DeckRule) => boolean,
 *   showConfirm: (message: string, opts?: object) => Promise<boolean>,
 *   showToast: (message: string, type?: string) => void,
 * }} ctx
 */
export async function loadShareWallDeckIntoBuilder(ctx) {
  const {
    deckJson,
    ruleJson,
    allCards,
    applyShareWallLoad,
    showConfirm,
    showToast,
  } = ctx;

  const deckShapeError = validateApiDeckJson(deckJson);
  if (deckShapeError) {
    showToast(`無法載入：${deckShapeError}`, 'error');
    return false;
  }

  const ruleShapeError = validateApiRuleJson(ruleJson);
  if (ruleShapeError) {
    showToast(`無法載入：${ruleShapeError}`, 'error');
    return false;
  }

  const { deck: newDeck, missingIds } = createDeckFromJsonIds(deckJson, allCards);
  if (missingIds.length > 0) {
    showToast(`部分卡牌無法載入（${missingIds.length} 張）`, 'warning');
  }

  const rule = apiRuleToDeckRule(ruleJson);
  const composition = validateDeckComposition(newDeck, rule);
  if (!composition.valid) {
    showToast(`無法載入：${composition.reason}`, 'error');
    return false;
  }

  const ok = await showConfirm('將此分享牌組載入組牌器？目前的牌組會被取代。', {
    title: '載入分享牌組',
  });
  if (!ok) return false;

  if (!applyShareWallLoad(newDeck, rule)) {
    showToast('載入失敗，請稍後再試', 'error');
    return false;
  }

  showToast('已載入分享牌組');
  return true;
}

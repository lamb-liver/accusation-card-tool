import { getMainDeckFactionDecision, checkSpecialCardFaction } from '../rules/index.js';
import { getAddBlockReason, getFactionAutoFill } from './rules.js';

/** @import { Card } from '../types.js' */

/**
 * @typedef {Object} DeckControllerCtx
 * @property {import('../types.js').Card[]} allCards
 * @property {(message: string, type?: import('../types.js').ToastType) => void} showToast
 * @property {(message: string, opts?: object) => Promise<boolean>} showConfirm
 * @property {(message: string, opts?: object) => Promise<string|null>} showPrompt
 */

/**
 * @typedef {Object} DeckAddHandlersDeps
 * @property {() => { deck: import('../types.js').Deck, currentRule: import('../types.js').DeckRule, primaryFaction: string, secondaryFaction: string }} getState
 * @property {DeckControllerCtx} ctx
 * @property {(updater: import('../types.js').Deck | ((prev: import('../types.js').Deck) => import('../types.js').Deck)) => boolean} patchDeck
 * @property {(patch: object) => boolean} commit
 * @property {(ruleType: string, primary: string, secondary: string, extraPatch?: object) => boolean} commitActiveRule
 */

/**
 * @param {DeckAddHandlersDeps} deps
 */
export function createDeckAddHandlers({ getState, ctx, patchDeck, commit, commitActiveRule }) {
  /**
   * @param {Card} card
   * @returns {Promise<boolean>}
   */
  async function performAddCard(card) {
    const { deck: latestDeck, currentRule: latestRule } = getState();

    const block = getAddBlockReason(card, latestDeck, latestRule);
    if (block.blocked) {
      ctx.showToast(block.reason, 'error');
      return false;
    }

    if (card.faction === '放逐者') {
      if (!patchDeck((prev) => ({ ...prev, main: [...prev.main, card] }))) return false;
      ctx.showToast(`已加入 ${card.name}`);
      return true;
    }

    if (card.type === '教主' || card.type === '儀式') {
      const err = checkSpecialCardFaction(card, latestRule);
      if (err) {
        ctx.showToast(err, 'error');
        return false;
      }
      const slot = card.type === '教主' ? 'leader' : 'rituals';
      if (!patchDeck((prev) => ({ ...prev, [slot]: [...prev[slot], card] }))) return false;
      ctx.showToast(`已加入 ${card.name}`);
      return true;
    }

    const factionDecision = getMainDeckFactionDecision(card, latestRule);
    if (factionDecision.kind === 'ask_secondary') {
      const ok = await ctx.showConfirm(
        `「${card.name}」屬於「${card.faction}」。\n您的主要教團是「${latestRule.primary}」。\n` +
          `是否將「${card.faction}」設為次要教團並加入牌組？`,
        { title: '設定次要教團', confirmLabel: '設定並加入' },
      );
      if (!ok) return false;
      const ruleReady = commitActiveRule('rule2', latestRule.primary, card.faction, {
        secondaryFaction: card.faction,
      });
      if (!ruleReady) return false;
      return performAddCard(card);
    }

    if (factionDecision.kind === 'deny') {
      ctx.showToast(factionDecision.reason, 'error');
      return false;
    }

    if (!patchDeck((prev) => ({ ...prev, main: [...prev.main, card] }))) return false;
    ctx.showToast(`已加入 ${card.name}`);
    return true;
  }

  async function addToDeck(card) {
    const {
      deck: latestDeck,
      currentRule: latestRule,
      primaryFaction: latestPrimary,
      secondaryFaction: latestSecondary,
    } = getState();

    const block = getAddBlockReason(card, latestDeck, latestRule);
    if (block.blocked) {
      ctx.showToast(block.reason, 'error');
      return;
    }

    if (!latestRule.isActive) {
      let ruleReady = false;
      if (!latestPrimary) {
        const ok = await ctx.showConfirm(`將「${card.faction}」設為主要教團？`);
        if (!ok) return;
        ruleReady = commitActiveRule('rule1', card.faction, '', { primaryFaction: card.faction });
      } else if (latestPrimary === card.faction) {
        ruleReady = commitActiveRule(latestRule.type, latestPrimary, latestSecondary);
      } else {
        const ok = await ctx.showConfirm(
          `您的主要教團已是「${latestPrimary}」。\n\n「${card.name}」屬於「${card.faction}」。\n\n` +
            `是否切換為【雙教團規則】，將「${card.faction}」加入為次要教團？\n（按「取消」可手動調整設定）`,
          { title: '教團衝突', confirmLabel: '切換雙教團', danger: true },
        );
        if (!ok) return;
        ruleReady = commitActiveRule('rule2', latestPrimary, card.faction, {
          secondaryFaction: card.faction,
        });
      }
      if (ruleReady) await performAddCard(card);
      return;
    }

    await performAddCard(card);
  }

  function handleSetPrimaryFaction(faction) {
    if (!commit({ primaryFaction: faction })) return;
    if (!faction || !ctx.allCards.length) return;

    const { leaderCard, ritualCards } = getFactionAutoFill(ctx.allCards, faction);
    if (!leaderCard && ritualCards.length === 0) return;

    const patched = patchDeck((prev) => ({
      ...prev,
      ...(leaderCard ? { leader: [leaderCard] } : {}),
      ...(ritualCards.length > 0 ? { rituals: ritualCards } : {}),
    }));
    if (!patched) return;

    const parts = [];
    if (leaderCard) parts.push(`教主「${leaderCard.name}」`);
    if (ritualCards.length) parts.push(`${ritualCards.length} 張儀式卡`);
    if (parts.length) ctx.showToast(`已自動填入 ${parts.join('、')}`, 'info');
  }

  return { performAddCard, addToDeck, handleSetPrimaryFaction };
}

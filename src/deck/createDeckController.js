import { MAX_SAVED_DECKS } from './constants.js';
import { persistStatePatch } from './storage.js';
import { loadInitialControllerState, loadSavedDecks } from './persistedState.js';
import { getDeckTotal, getPoolBlockedCardIds, validateDeckComposition } from './rules.js';
import { createDeckAddHandlers } from './deckAddHandlers.js';
import { createDeckImportHandlers } from './deckImportHandlers.js';
import {
  findSavedDeckByName,
  removeSavedDeckByName,
  upsertSavedDeck,
} from './savedDecks.js';

/** @import { Card, Deck, DeckRule } from '../types.js' */

/**
 * @typedef {Object} DeckControllerDeps
 * @property {Card[]} allCards
 * @property {(message: string, type?: import('../types.js').ToastType) => void} showToast
 * @property {(message: string, opts?: object) => Promise<boolean>} showConfirm
 * @property {(message: string, opts?: object) => Promise<string|null>} showPrompt
 */

/**
 * 牌組領域控制器：集中狀態、持久化與 command，可不依賴 React 測試。
 *
 * @param {DeckControllerDeps} deps
 */
export function createDeckController(deps) {
  /** @type {DeckControllerDeps} */
  let ctx = { ...deps };

  const persisted = loadInitialControllerState();

  /** @type {{ deck: Deck, currentRule: DeckRule, primaryFaction: string, secondaryFaction: string, savedDecks: import('../types.js').SavedDeck[] }} */
  let state = {
    deck: persisted.deck,
    currentRule: persisted.currentRule,
    primaryFaction: persisted.primaryFaction,
    secondaryFaction: persisted.secondaryFaction,
    savedDecks: loadSavedDecks(),
  };

  let snapshot = { ...state };
  const listeners = new Set();

  if (persisted.wasSanitized) {
    try {
      persistStatePatch(state, { deck: true, rule: true });
    } catch (error) {
      console.error('重置損壞牌組時寫入失敗:', error);
    }
    ctx.showToast('本地牌組資料異常已重置', 'warning');
  }

  const getState = () => state;

  function notify() {
    snapshot = {
      deck: state.deck,
      currentRule: state.currentRule,
      primaryFaction: state.primaryFaction,
      secondaryFaction: state.secondaryFaction,
      savedDecks: state.savedDecks,
    };
    for (const listener of listeners) listener();
  }

  /**
   * @param {Partial<typeof state>} patch
   * @returns {boolean}
   */
  function commit(patch) {
    const nextState = {
      deck: patch.deck !== undefined ? patch.deck : state.deck,
      currentRule: patch.currentRule !== undefined ? patch.currentRule : state.currentRule,
      primaryFaction: patch.primaryFaction !== undefined ? patch.primaryFaction : state.primaryFaction,
      secondaryFaction:
        patch.secondaryFaction !== undefined ? patch.secondaryFaction : state.secondaryFaction,
      savedDecks: patch.savedDecks !== undefined ? patch.savedDecks : state.savedDecks,
    };

    const needsPersist =
      patch.deck !== undefined ||
      patch.savedDecks !== undefined ||
      patch.currentRule !== undefined ||
      patch.primaryFaction !== undefined ||
      patch.secondaryFaction !== undefined;

    if (!needsPersist) {
      state = nextState;
      notify();
      return true;
    }

    try {
      persistStatePatch(nextState, {
        deck: patch.deck !== undefined,
        savedDecks: patch.savedDecks !== undefined,
        rule:
          patch.currentRule !== undefined ||
          patch.primaryFaction !== undefined ||
          patch.secondaryFaction !== undefined,
      });
    } catch (error) {
      console.error('存檔失敗:', error);
      ctx.showToast('本地存檔失敗，請清理瀏覽器空間後再試', 'error');
      return false;
    }

    state = nextState;
    notify();
    return true;
  }

  /**
   * @param {Deck | ((prev: Deck) => Deck)} updater
   * @returns {boolean}
   */
  function patchDeck(updater) {
    const next = typeof updater === 'function' ? updater(state.deck) : updater;
    return commit({ deck: next });
  }

  function buildActiveRule(ruleType, primary, secondary) {
    return {
      isActive: true,
      type: ruleType || 'rule1',
      primary: primary || '',
      secondary: secondary || '',
    };
  }

  /**
   * @param {Partial<typeof state>} extraPatch
   * @returns {boolean}
   */
  function commitActiveRule(ruleType, primary, secondary, extraPatch = {}) {
    const nextRule = buildActiveRule(ruleType, primary, secondary);

    if (ruleType === 'rule2' && primary) {
      const prev = state.deck;
      const removedLeader = prev.leader.filter((card) => card.faction !== primary);
      const removedRituals = prev.rituals.filter((card) => card.faction !== primary);
      if (removedLeader.length === 0 && removedRituals.length === 0) {
        return commit({ ...extraPatch, currentRule: nextRule });
      }
      return commit({
        ...extraPatch,
        currentRule: nextRule,
        deck: {
          ...prev,
          leader: prev.leader.filter((card) => card.faction === primary),
          rituals: prev.rituals.filter((card) => card.faction === primary),
        },
      });
    }

    return commit({ ...extraPatch, currentRule: nextRule });
  }

  function applyRuleLogic(ruleType, primary, secondary) {
    return commitActiveRule(ruleType, primary, secondary);
  }

  const { addToDeck, handleSetPrimaryFaction } = createDeckAddHandlers({
    getState,
    ctx,
    patchDeck,
    commit,
    commitActiveRule,
  });

  const { importDeck, exportAsText, exportAsJson, exportDeckAsImage } = createDeckImportHandlers({
    getState,
    ctx,
    commit,
  });

  const api = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot() {
      return snapshot;
    },

    setAllCards(allCards) {
      ctx.allCards = allCards;
    },

    setUi({ showToast, showConfirm, showPrompt }) {
      ctx.showToast = showToast;
      ctx.showConfirm = showConfirm;
      ctx.showPrompt = showPrompt;
    },

    setDeck: patchDeck,
    setCurrentRule: (updater) => {
      const next = typeof updater === 'function' ? updater(state.currentRule) : updater;
      return commit({ currentRule: next });
    },
    applyShareWallLoad: (deck, rule) =>
      commit({
        deck,
        currentRule: rule,
        primaryFaction: rule.primary || '',
        secondaryFaction: rule.secondary || '',
      }),
    setPrimaryFaction: (faction) => commit({ primaryFaction: faction }),
    setSecondaryFaction: (faction) => commit({ secondaryFaction: faction }),

    applyRuleLogic,
    handleSetPrimaryFaction,
    addToDeck,
    removeFromDeck: (cardId) => {
      patchDeck((prev) => ({
        leader: prev.leader.filter((card) => card.id !== cardId),
        rituals: prev.rituals.filter((card) => card.id !== cardId),
        main: prev.main.filter((card) => card.id !== cardId),
      }));
    },
    reorderDeckMain: (newMain) => {
      patchDeck((prev) => ({ ...prev, main: newMain }));
    },
    clearDeckSection: (section) => {
      if (section !== 'leader' && section !== 'rituals' && section !== 'main') return;
      patchDeck((prev) => {
        if (prev[section].length === 0) return prev;
        return { ...prev, [section]: [] };
      });
    },
    clearDeckOnly: async () => {
      const ok = await ctx.showConfirm('確定要清空牌組嗎？', {
        title: '清空牌組',
        confirmLabel: '清空',
        danger: true,
      });
      if (!ok) return;
      if (!commit({ deck: { leader: [], rituals: [], main: [] } })) return;
      ctx.showToast('牌組已清空', 'info');
    },
    resetRuleAndClearDeck: async () => {
      const ok = await ctx.showConfirm('確定要重置規則並清空牌組嗎？', {
        title: '重置規則',
        confirmLabel: '重置',
        danger: true,
      });
      if (!ok) return;

      if (
        !commit({
          deck: { leader: [], rituals: [], main: [] },
          currentRule: { isActive: false, type: 'rule1', primary: '', secondary: '' },
          primaryFaction: '',
          secondaryFaction: '',
        })
      ) {
        return;
      }
      ctx.showToast('已重置規則並清空牌組', 'info');
    },
    saveDeckAs: async (name) => {
      const trimmed = name?.trim();
      if (!trimmed) {
        ctx.showToast('請輸入牌組名稱', 'warning');
        return;
      }

      const total = getDeckTotal(state.deck);
      if (total === 0) {
        ctx.showToast('牌組是空的，無法儲存', 'warning');
        return;
      }

      const composition = validateDeckComposition(state.deck, state.currentRule);
      if (!composition.valid) {
        ctx.showToast(`無法儲存：${composition.reason}`, 'warning');
        return;
      }

      const { kind, next } = upsertSavedDeck(
        state.savedDecks,
        trimmed,
        state.deck,
        state.currentRule,
        MAX_SAVED_DECKS,
      );
      if (kind === 'limit') {
        ctx.showToast(`已達上限（${MAX_SAVED_DECKS} 組），請先刪除舊牌組`, 'warning');
        return;
      }

      if (!commit({ savedDecks: next })) return;
      if (kind === 'updated') {
        ctx.showToast(`牌組「${trimmed}」已更新`);
        return;
      }
      ctx.showToast(`牌組「${trimmed}」已儲存`);
    },
    loadSavedDeckByName: async (name) => {
      const found = findSavedDeckByName(state.savedDecks, name);
      if (!found) return;

      const ok = await ctx.showConfirm(`載入牌組「${name}」？目前牌組將被覆蓋。`, {
        title: '載入牌組',
        confirmLabel: '載入',
      });
      if (!ok) return;

      const ruleForValidation = found.rule ?? {
        isActive: false,
        type: 'rule1',
        primary: '',
        secondary: '',
      };
      const composition = validateDeckComposition(found.deck, ruleForValidation);
      if (!composition.valid) {
        ctx.showToast(`無法載入：${composition.reason}`, 'error');
        return;
      }

      const loaded = found.rule
        ? commit({
            deck: found.deck,
            currentRule: found.rule,
            primaryFaction: found.rule.primary || '',
            secondaryFaction: found.rule.secondary || '',
          })
        : commit({ deck: found.deck });
      if (!loaded) return;
      ctx.showToast(`已載入「${name}」`);
    },
    deleteSavedDeck: async (name) => {
      const ok = await ctx.showConfirm(`刪除牌組「${name}」？此操作無法復原。`, {
        title: '刪除牌組',
        confirmLabel: '刪除',
        danger: true,
      });
      if (!ok) return;

      if (!commit({ savedDecks: removeSavedDeckByName(state.savedDecks, name) })) return;
      ctx.showToast(`已刪除「${name}」`, 'info');
    },
    exportAsText,
    exportAsJson,
    exportDeckAsImage,
    importDeck,
    getPoolBlockedCardIds: (cards) => getPoolBlockedCardIds(state.deck, state.currentRule, cards),
  };

  return api;
}

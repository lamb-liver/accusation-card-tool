import { useEffect, useState, useSyncExternalStore } from 'react';
import { createDeckController } from '../deck/createDeckController.js';

/** @import { Card } from '../types.js' */

/**
 * React hook：訂閱牌組領域狀態與 command。
 * 業務邏輯見 {@link createDeckController}。
 *
 * @param {Card[]} allCards
 * @param {(message: string, type?: import('../types.js').ToastType) => void} showToast
 * @param {(message: string, opts?: object) => Promise<boolean>} showConfirm
 * @param {(message: string, opts?: object) => Promise<string|null>} showPrompt
 */
export function useDeck(
  allCards,
  showToast = () => {},
  showConfirm = (message) => Promise.resolve(window.confirm(message)),
  showPrompt = (message) => Promise.resolve(window.prompt(message)),
) {
  const [controller] = useState(() =>
    createDeckController({ allCards, showToast, showConfirm, showPrompt }),
  );

  useEffect(() => {
    controller.setAllCards(allCards);
  }, [allCards, controller]);

  useEffect(() => {
    controller.setUi({ showToast, showConfirm, showPrompt });
  }, [showToast, showConfirm, showPrompt, controller]);

  const { deck, currentRule, primaryFaction, secondaryFaction, savedDecks } = useSyncExternalStore(
    (onStoreChange) => controller.subscribe(onStoreChange),
    () => controller.getSnapshot(),
    () => controller.getSnapshot(),
  );

  return {
    deck,
    setDeck: controller.setDeck,
    currentRule,
    setCurrentRule: controller.setCurrentRule,
    primaryFaction,
    setPrimaryFaction: controller.setPrimaryFaction,
    handleSetPrimaryFaction: controller.handleSetPrimaryFaction,
    secondaryFaction,
    setSecondaryFaction: controller.setSecondaryFaction,
    savedDecks,
    applyRuleLogic: controller.applyRuleLogic,
    addToDeck: controller.addToDeck,
    removeFromDeck: controller.removeFromDeck,
    reorderDeckMain: controller.reorderDeckMain,
    clearDeckSection: controller.clearDeckSection,
    clearDeckOnly: controller.clearDeckOnly,
    resetRuleAndClearDeck: controller.resetRuleAndClearDeck,
    saveDeckAs: controller.saveDeckAs,
    loadSavedDeckByName: controller.loadSavedDeckByName,
    deleteSavedDeck: controller.deleteSavedDeck,
    exportAsText: controller.exportAsText,
    exportAsJson: controller.exportAsJson,
    exportDeckAsImage: controller.exportDeckAsImage,
    importDeck: controller.importDeck,
    getPoolBlockedCardIds: controller.getPoolBlockedCardIds,
  };
}

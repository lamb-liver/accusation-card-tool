import { useCallback, useEffect, useState } from 'react';
import {
  canSubmitDeckToShareWall,
  loadShareWallDeckIntoBuilder,
  submitDeckShareForm,
} from '../deck/shareWallHandlers.js';
import { formatShareWallError } from '../utils/formatShareWallError.js';
import {
  clearCommunityListState,
  consumeCommunityReturnPath,
  saveCommunityListState,
} from '../utils/communityScroll.js';

export function useCommunityDeckFlow({
  currentMode,
  navigate,
  deck,
  currentRule,
  allCards,
  applyShareWallLoad,
  showConfirm,
  showToast,
}) {
  const [deckSubmitOpen, setDeckSubmitOpen] = useState(false);
  const [deckSubmitting, setDeckSubmitting] = useState(false);

  const handleOpenShareDeck = useCallback((shareId) => {
    saveCommunityListState();
    navigate(`decks/${shareId}`);
  }, [navigate]);

  const handleBackToCommunity = useCallback(() => {
    navigate(consumeCommunityReturnPath());
  }, [navigate]);

  useEffect(() => {
    if (currentMode !== 'community') {
      clearCommunityListState();
    }
  }, [currentMode]);

  const handleSubmitToShareWall = useCallback(() => {
    if (!canSubmitDeckToShareWall(deck, currentRule, showToast)) return;
    setDeckSubmitOpen(true);
  }, [deck, currentRule, showToast]);

  const handleDeckShareSubmit = useCallback(async (form) => {
    setDeckSubmitting(true);
    try {
      await submitDeckShareForm(deck, currentRule, form);
      showToast('投稿成功，等待管理員審核', 'success');
      setDeckSubmitOpen(false);
    } catch (error) {
      showToast(formatShareWallError(error, '投稿失敗'), 'error');
    } finally {
      setDeckSubmitting(false);
    }
  }, [deck, currentRule, showToast]);

  const handleLoadShareDeck = useCallback(async (shareDeck) => {
    const loaded = await loadShareWallDeckIntoBuilder({
      deckJson: shareDeck.deck_json,
      ruleJson: shareDeck.rule_json,
      allCards,
      applyShareWallLoad,
      showConfirm,
      showToast,
    });
    if (loaded) navigate('deck');
  }, [
    allCards,
    applyShareWallLoad,
    navigate,
    showConfirm,
    showToast,
  ]);

  const closeDeckSubmitModal = useCallback(() => {
    if (!deckSubmitting) setDeckSubmitOpen(false);
  }, [deckSubmitting]);

  return {
    deckSubmitOpen,
    deckSubmitting,
    closeDeckSubmitModal,
    handleOpenShareDeck,
    handleBackToCommunity,
    handleSubmitToShareWall,
    handleDeckShareSubmit,
    handleLoadShareDeck,
  };
}

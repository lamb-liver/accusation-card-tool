import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { filterCardsByRule, sortCardsForRuleDisplay } from '../rules/index.js';
import DeckListPanel from './deckBuilder/DeckListPanel.jsx';
import DeckPoolSection from './deckBuilder/DeckPoolSection.jsx';

function DeckBuilder({
  deck,
  filteredCards,
  onRemoveCard,
  onCardClick,
  onAddCard,
  currentRule,
  primaryFaction,
  secondaryFaction,
  onSetPrimaryFaction,
  onSetSecondaryFaction,
  onApplyRule,
  onClearDeckOnly,
  onClearCategory = null,
  onResetRuleAndClear,
  savedDecks = [],
  onSaveDeck,
  onLoadDeck,
  onDeleteDeck,
  onShowConfirm,
  onShowToast = () => {},
  onExportText,
  onExportJson,
  onExportImage,
  onImportDeck,
  onSubmitToShareWall,
  onReorderMain = () => {},
  getPoolBlockedCardIds,
}) {
  const [hideSelected, setHideSelected] = useState(false);
  const [ruleSelect, setRuleSelect] = useState(currentRule.type || 'rule1');
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  useEffect(() => {
    setRuleSelect(currentRule.type || 'rule1');
  }, [currentRule.type]);

  const mainListRef = useRef(null);
  const deckMainRef = useRef(deck.main);
  const mainOrderKey = deck.main.map((card) => card.id).join(',');

  useLayoutEffect(() => {
    deckMainRef.current = deck.main;
  }, [deck.main]);

  useEffect(() => {
    const el = mainListRef.current;
    if (!el || deck.main.length === 0) return undefined;

    let sortable;
    let cancelled = false;

    import('sortablejs').then(({ default: Sortable }) => {
      if (cancelled || !mainListRef.current) return;
      sortable = Sortable.create(mainListRef.current, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        draggable: '[data-sort-main]',
        filter: 'button',
        preventOnFilter: true,
        onEnd() {
          const listEl = mainListRef.current;
          if (!listEl) return;
          const ids = [...listEl.querySelectorAll('li[data-sort-main]')].map((li) =>
            li.getAttribute('data-card-id'),
          );
          const map = new Map(deckMainRef.current.map((card) => [card.id, card]));
          const newMain = ids.map((id) => map.get(id)).filter(Boolean);
          if (newMain.length === deckMainRef.current.length) {
            onReorderMain(newMain);
          }
        },
      });
    });

    return () => {
      cancelled = true;
      sortable?.destroy();
    };
  }, [mainOrderKey, deck.main.length, onReorderMain]);

  const totalCards = deck.leader.length + deck.rituals.length + deck.main.length;

  const inDeckIds = useMemo(
    () =>
      new Set([
        ...deck.leader.map((card) => card.id),
        ...deck.rituals.map((card) => card.id),
        ...deck.main.map((card) => card.id),
      ]),
    [deck]
  );

  const displayCards = useMemo(() => {
    let available = currentRule.isActive
      ? filterCardsByRule(filteredCards, currentRule)
      : filteredCards;

    if (currentRule.isActive && currentRule.type === 'rule2') {
      available = sortCardsForRuleDisplay(available, currentRule);
    }

    if (hideSelected) {
      available = available.filter((card) => !inDeckIds.has(card.id));
    }

    return available;
  }, [currentRule, filteredCards, hideSelected, inDeckIds]);

  const limitedCardIds = useMemo(
    () => getPoolBlockedCardIds(displayCards),
    [displayCards, getPoolBlockedCardIds],
  );

  const handleApplyRule = useCallback(
    (...args) => {
      onApplyRule(...args);
      setBottomSheetOpen(false);
    },
    [onApplyRule],
  );

  const primaryCount = useMemo(
    () => deck.main.filter((card) => card.faction === primaryFaction).length,
    [deck.main, primaryFaction]
  );
  const secondaryCount = useMemo(
    () => deck.main.filter((card) => card.faction === secondaryFaction).length,
    [deck.main, secondaryFaction]
  );
  const exileCount = useMemo(
    () => deck.main.filter((card) => card.faction === '放逐者').length,
    [deck.main]
  );

  const clearCategory = useCallback(
    async (category) => {
      const label = category === 'leader' ? '教主' : category === 'rituals' ? '儀式' : '主牌組';
      const ok = await onShowConfirm(`確定要清空「${label}」欄位嗎？`, {
        title: `清空${label}`,
        confirmLabel: '清空',
        danger: true,
      });
      if (!ok) return;

      if (onClearCategory) {
        onClearCategory(category);
        return;
      }

      const cards =
        category === 'leader' ? deck.leader : category === 'rituals' ? deck.rituals : deck.main;
      cards.forEach((card) => onRemoveCard(card.id));
    },
    [deck.leader, deck.main, deck.rituals, onClearCategory, onRemoveCard, onShowConfirm]
  );

  return (
    <div className="deck-builder-container flex min-w-0 w-full flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-4">
      {bottomSheetOpen && (
        <button
          type="button"
          aria-label="關閉牌組清單"
          className="lg:hidden fixed inset-0 bg-black/50 z-[390]"
          onClick={() => setBottomSheetOpen(false)}
        />
      )}

      <DeckListPanel
        bottomSheetOpen={bottomSheetOpen}
        onToggleBottomSheet={() => setBottomSheetOpen((open) => !open)}
        totalCards={totalCards}
        deck={deck}
        currentRule={currentRule}
        primaryFaction={primaryFaction}
        secondaryFaction={secondaryFaction}
        ruleSelect={ruleSelect}
        onRuleSelectChange={setRuleSelect}
        onSetPrimaryFaction={onSetPrimaryFaction}
        onSetSecondaryFaction={onSetSecondaryFaction}
        onApplyRule={handleApplyRule}
        onShowToast={onShowToast}
        onClearDeckOnly={onClearDeckOnly}
        onResetRuleAndClear={onResetRuleAndClear}
        onClearCategory={clearCategory}
        onRemoveCard={onRemoveCard}
        mainListRef={mainListRef}
        primaryCount={primaryCount}
        secondaryCount={secondaryCount}
        exileCount={exileCount}
        savedDecks={savedDecks}
        onSaveDeck={onSaveDeck}
        onLoadDeck={onLoadDeck}
        onDeleteDeck={onDeleteDeck}
        onExportText={onExportText}
        onExportJson={onExportJson}
        onExportImage={onExportImage}
        onImportDeck={onImportDeck}
        onSubmitToShareWall={onSubmitToShareWall}
      />

      <DeckPoolSection
        hideSelected={hideSelected}
        onHideSelectedChange={setHideSelected}
        displayCards={displayCards}
        onCardClick={onCardClick}
        onAddCard={onAddCard}
        onRemoveCard={onRemoveCard}
        limitedCardIds={limitedCardIds}
        inDeckIds={inDeckIds}
      />
    </div>
  );
}

export default DeckBuilder;

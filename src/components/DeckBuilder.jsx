import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { filterCardsByRule, sortCardsForRuleDisplay } from '../rules/index.js';
import { sortMainDeck } from '../deck/sortMainDeck.js';
import { collectDeckSymbolCounts } from '../deck/deckSymbolStats.js';
import DeckListPanel from './deckBuilder/DeckListPanel.jsx';
import DeckPoolSection from './deckBuilder/DeckPoolSection.jsx';

const HIDE_IMAGES_KEY = 'accusation-deck-hide-images';

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
  // 隱藏卡圖偏好持久化：組牌習慣穩定，跨次記住
  const [hideImages, setHideImages] = useState(() => {
    try {
      return localStorage.getItem(HIDE_IMAGES_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [ruleSelect, setRuleSelect] = useState(currentRule.type || 'rule1');
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  useEffect(() => {
    setRuleSelect(currentRule.type || 'rule1');
  }, [currentRule.type]);

  useEffect(() => {
    try {
      localStorage.setItem(HIDE_IMAGES_KEY, hideImages ? '1' : '0');
    } catch {
      /* ignore quota / private mode */
    }
  }, [hideImages]);

  const mainListRef = useRef(null);
  const deckMainRef = useRef(deck.main);
  const mainOrderKey = useMemo(
    () => deck.main.map((card) => card.id).join(','),
    [deck.main],
  );

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

  /** 牌組列點開詳情：以整副牌（教主→儀式→主牌組）為導航清單 */
  const deckCardList = useMemo(
    () => [...deck.leader, ...deck.rituals, ...deck.main],
    [deck.leader, deck.rituals, deck.main],
  );
  const handleDeckCardClick = useCallback(
    (card) => onCardClick(card, deckCardList),
    [onCardClick, deckCardList],
  );

  const handleSortMain = useCallback(() => {
    const sorted = sortMainDeck(deck.main, currentRule);
    // 已是排序後結果就不必寫入（避免無意義的 state 更新）
    if (sorted.some((card, i) => card.id !== deck.main[i].id)) {
      onReorderMain(sorted);
    }
  }, [deck.main, currentRule, onReorderMain]);

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

  const symbolEntries = useMemo(() => collectDeckSymbolCounts(deck), [deck]);

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
        onSortMain={handleSortMain}
        onCardClick={handleDeckCardClick}
        onRemoveCard={onRemoveCard}
        mainListRef={mainListRef}
        primaryCount={primaryCount}
        secondaryCount={secondaryCount}
        exileCount={exileCount}
        symbolEntries={symbolEntries}
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
        hideImages={hideImages}
        onHideImagesChange={setHideImages}
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

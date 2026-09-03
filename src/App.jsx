import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useCardData }    from './hooks/useCardData.js';
import { useCardFilters, FILTER_KEYS } from './hooks/useCardFilters.js';
import { usePagination }  from './hooks/usePagination.js';
import { useDeck }        from './hooks/useDeck.js';
import { useCardModal }   from './hooks/useCardModal.js';
import { useToast }       from './hooks/useToast.js';
import { useDialog }      from './hooks/useDialog.js';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useCommunityDeckFlow } from './hooks/useCommunityDeckFlow.js';
import { findCardById } from './utils/cardCatalog.js';
import DeckSubmitModal from './components/shareWall/DeckSubmitModal.jsx';

import FilterToolbar       from './components/FilterToolbar.jsx';
import CardGallery         from './components/CardGallery.jsx';
import PaginationControls  from './components/PaginationControls.jsx';
import MobileFilterDrawer  from './components/MobileFilterDrawer.jsx';
import BackToTopButton     from './components/BackToTopButton.jsx';
import { scrollToTop }     from './utils/scrollToTop.js';
import AppFooter           from './components/AppFooter.jsx';
import ToastList           from './components/ToastList.jsx';
import DialogContainer    from './components/DialogContainer.jsx';
import AppPageBackground  from './components/AppPageBackground.jsx';

const DeckBuilder = lazy(() => import('./components/DeckBuilder.jsx'));
const QASection = lazy(() => import('./components/QASection.jsx'));
const CardModal = lazy(() => import('./components/CardModal.jsx'));
const CommunitySection = lazy(() => import('./components/community/CommunitySection.jsx'));
const DeckShareDetail = lazy(() => import('./components/shareWall/DeckShareDetail.jsx'));
const AdminSection = lazy(() => import('./components/admin/AdminSection.jsx'));
const ClockPage = lazy(() => import('./features/clock/ClockPage.jsx'));

function SectionFallback({ label = '載入中…' }) {
  return (
    <div className="flex min-h-48 items-center justify-center text-gray-400" aria-busy="true">
      {label}
    </div>
  );
}

function resolveModeFromRoute(route) {
  if (route.kind === 'admin') return 'admin';
  if (route.kind === 'deck-detail' || route.kind === 'community') return 'community';
  if (route.kind === 'deck') return 'deck';
  if (route.kind === 'qa') return 'qa';
  if (route.kind === 'clock') return 'clock';
  return 'gallery';
}

/**
 * 網址 query ←→ 篩選狀態的對應。
 * 搜尋詞用 `q`（比 searchTerm 短且是慣例），其餘篩選維度同名。
 */
function filtersToQuery(searchTerm, filters, cardId) {
  const query = {};
  if (searchTerm.trim()) query.q = searchTerm;
  for (const key of FILTER_KEYS) {
    if (filters[key]) query[key] = filters[key];
  }
  if (cardId) query.card = cardId;
  return query;
}

function App() {
  const { route, query, navigate, setQuery } = useHashRoute();
  const currentMode = resolveModeFromRoute(route);

  /**
   * 首次 mount 時的網址狀態。
   *
   * 用 useState 凍結而非每次讀 `query`：篩選的真相源是 React state，網址只是
   * 它的投影；若每次 render 都拿當下的 query 當初始值，同步回寫時兩邊會互相
   * 覆蓋。（不用 ref 是因為 render 期間不得讀取 ref。）
   */
  const [initialQuery] = useState(query);

  const showDeckDetail = route.kind === 'deck-detail';
  const detailShareId = route.kind === 'deck-detail' ? route.shareId : null;
  const communityScrollTarget =
    route.kind === 'community' ? route.communityScroll : undefined;

  // ── 資料層 ────────────────────────────────────────────────────────────────
  const { allCards, isLoading, isError, retry }                         = useCardData();
  const { searchTerm, setSearchTerm, filters, setFilters, handleFilterChange,
          filteredCards,
          activeFilterCount, resetFilters }                            = useCardFilters(allCards, {
            searchTerm: initialQuery.q,
            filters: initialQuery,
          });
  const { setCurrentPage, perPage, isPaginationMode,
          totalPages, safePage, paginatedCards, handlePerPageChange }   = usePagination(filteredCards);

  const handleModeChange = useCallback((mode) => {
    if (mode !== currentMode) resetFilters();
    if (mode === 'community') navigate('community');
    else if (mode === 'admin') navigate('admin');
    else if (mode === 'deck') navigate('deck');
    else if (mode === 'qa') navigate('qa');
    else if (mode === 'clock') navigate('clock');
    else navigate('');
  }, [currentMode, navigate, resetFilters]);

  // ── Toast & Dialog ────────────────────────────────────────────────────────
  const { toasts, showToast }                     = useToast();
  const { dialogState, resolve, showConfirm, showPrompt } = useDialog();

  // ── 牌組層 ────────────────────────────────────────────────────────────────
  const {
    deck,
    currentRule,
    primaryFaction,   handleSetPrimaryFaction,
    secondaryFaction, setSecondaryFaction,
    savedDecks,
    applyRuleLogic,
    addToDeck,
    removeFromDeck,
    reorderDeckMain,
    clearDeckOnly,
    clearDeckSection,
    resetRuleAndClearDeck,
    saveDeckAs,
    loadSavedDeckByName,
    deleteSavedDeck,
    exportAsText,
    exportAsJson,
    exportDeckAsImage,
    importDeck,
    getPoolBlockedCardIds,
    applyShareWallLoad,
  } = useDeck(allCards, showToast, showConfirm, showPrompt);

  const {
    deckSubmitOpen,
    deckSubmitting,
    closeDeckSubmitModal,
    handleOpenShareDeck,
    handleBackToCommunity,
    handleSubmitToShareWall,
    handleDeckShareSubmit,
    handleLoadShareDeck,
  } = useCommunityDeckFlow({
    currentMode,
    navigate,
    deck,
    currentRule,
    allCards,
    applyShareWallLoad,
    showConfirm,
    showToast,
  });

  // ── Modal 層 ──────────────────────────────────────────────────────────────
  const {
    selectedCard,
    selectedCardList,
    handleCardClick,
    handleModalPrev,
    handleModalNext,
    closeModal,
  } = useCardModal();

  /** 穩定識別：inline 箭頭會在每次 render 打破 CardGallery/Card 的 memo */
  const handleGalleryCardClick = useCallback(
    (card) => handleCardClick(card, filteredCards),
    [handleCardClick, filteredCards],
  );

  /**
   * 篩選只寫進查卡網址。組牌只保留 card=（若有彈窗），避免查卡篩選跟著組牌走。
   *
   * 存「模式名或 null」而非布林：gallery↔deck 互切時 navigate 會清掉網址
   * query，若依賴布林（兩模式下都是 true、值不變），同步 effect 不會重跑。
   */
  const querySyncMode =
    currentMode === 'gallery' || currentMode === 'deck' ? currentMode : null;

  /**
   * URL `card=` → 彈窗。只在彈窗尚未開啟時 hydrate（深層連結、靜態卡頁）。
   * 彈窗內左右切換會先改 selectedCard、再由下方 sync 寫回 hash；若這裡
   * 用舊的 query.card 覆寫，會把卡拽回去並重掛卡圖。
   *
   * 關閉不從這裡推：query-sync 若在 selectedCard 還是 null 時把 card= 清掉，
   * 深層連結會在卡表載入前就斷掉。關閉改由 handleCloseModal 自己寫網址。
   */
  useEffect(() => {
    const cardId = query.card;
    if (!cardId || allCards.length === 0) return;
    if (selectedCard?.id === cardId) return;
    // Modal already open: arrow prev/next updates selectedCard before the hash.
    // Hydrating from a stale query.card would yank back a card and remount art.
    // Deep links / share URLs open when selectedCard is still null.
    if (selectedCard) return;
    const card = findCardById(allCards, cardId);
    if (card) handleCardClick(card, allCards);
  }, [query.card, allCards, selectedCard, handleCardClick]);

  /**
   * 篩選／彈窗 → 網址。selectedCard 尚未對上 URL 的 card 時先保留網址上的 id，
   * 避免卡表載入前把深層連結清掉。
   */
  useEffect(() => {
    if (!querySyncMode) return;
    const cardId = selectedCard?.id ?? query.card;
    if (querySyncMode === 'deck') {
      setQuery(cardId ? { card: cardId } : {});
      return;
    }
    setQuery(filtersToQuery(searchTerm, filters, cardId));
  }, [querySyncMode, searchTerm, filters, selectedCard, query.card, setQuery]);

  /** 換頁／改每頁張數後回到頁首，避免使用者停留在新頁面的底部 */
  const handlePageChange = useCallback(
    (page) => {
      setCurrentPage(page);
      scrollToTop();
    },
    [setCurrentPage],
  );
  const handlePerPageChangeAndScroll = useCallback(
    (value) => {
      handlePerPageChange(value);
      scrollToTop();
    },
    [handlePerPageChange],
  );

  /** 關閉彈窗並從網址拿掉 card=（保留查卡篩選） */
  const handleCloseModal = useCallback(() => {
    closeModal();
    if (querySyncMode === 'deck') setQuery({});
    else if (querySyncMode === 'gallery') setQuery(filtersToQuery(searchTerm, filters));
  }, [closeModal, querySyncMode, searchTerm, filters, setQuery]);

  /** 卡片彈窗 →「查看此教團常見問題」：關閉彈窗並開在該教團分類 */
  const handleViewFactionQA = useCallback(
    (faction) => {
      closeModal();
      navigate(`qa/${encodeURIComponent(faction)}`);
      scrollToTop();
    },
    [closeModal, navigate],
  );

  /** 卡片彈窗用：判斷該卡是否已在牌組，避免顯示按下無效的「加入牌組」 */
  const deckCardIds = useMemo(
    () => new Set([...deck.leader, ...deck.rituals, ...deck.main].map((card) => card.id)),
    [deck],
  );

  /**
   * 篩選變更同樣重置頁碼，需比照換頁回到頁首，否則會停在短結果集的空白區。
   * 搜尋輸入不在此列：輸入框在頂端置頂列，逐字回捲反而干擾打字。
   */
  const handleFilterChangeAndScroll = useCallback(
    (key, value) => {
      handleFilterChange(key, value);
      scrollToTop();
    },
    [handleFilterChange],
  );

  const handleClearFilters = useCallback(() => {
    resetFilters();
    scrollToTop();
  }, [resetFilters]);

  const handleDrawerApply = useCallback(
    ({ searchTerm: nextSearch, filters: nextFilters }) => {
      setSearchTerm(nextSearch);
      setFilters(nextFilters);
      scrollToTop();
    },
    [setSearchTerm, setFilters],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell min-h-screen text-gray-200 font-sans">
      <AppPageBackground />
      <div className="app-shell-content flex min-h-screen flex-col">
      {currentMode !== 'admin' && (
        <div className={currentMode === 'deck' ? 'shrink-0' : undefined}>
          <FilterToolbar
            currentMode={currentMode}
            onModeChange={handleModeChange}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filters}
            onFilterChange={handleFilterChangeAndScroll}
            resultCount={filteredCards.length}
            activeFilterCount={activeFilterCount}
            onClearFilters={handleClearFilters}
          />
        </div>
      )}

      <MobileFilterDrawer
        searchTerm={searchTerm}
        filters={filters}
        fabVisible={currentMode === 'gallery'}
        fabZIndex={900}
        activeFilterCount={activeFilterCount}
        onApply={handleDrawerApply}
      />

      <main
        className={`mx-auto w-full max-w-7xl ${
          currentMode === 'deck' ? 'px-2 py-3 sm:px-4 lg:p-4' : 'mt-4 p-4'
        }`}
      >
        {isError && (currentMode === 'gallery' || currentMode === 'deck') && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-500/60 bg-red-950/40 px-4 py-3 text-red-300" role="alert">
            <span className="flex min-w-0 items-start gap-2">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden strokeWidth={2.25} />
              <span className="leading-snug">卡牌資料載入失敗，請確認網路連線後重試。</span>
            </span>
            <button
              onClick={retry}
              className="shrink-0 rounded border border-red-400 px-3 py-1 text-sm transition hover:bg-red-500/20"
            >
              重新載入
            </button>
          </div>
        )}

        {currentMode === 'gallery' && (
          <>
            <BackToTopButton />
            <div className="mb-4 text-center md:hidden">
              {isLoading ? (
                <p className="text-sm text-gray-400">載入卡牌資料中…</p>
              ) : (
                <p className="text-sm font-medium text-stone-400">
                  找到 <span className="font-bold text-brand-gold">{filteredCards.length}</span> 張卡片
                </p>
              )}
            </div>

            <div className="card-gallery-slot">
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: perPage }).map((_, i) => (
                    <div
                      key={i}
                      className="min-h-[320px] rounded-lg bg-neutral-800 animate-pulse"
                      aria-hidden
                    />
                  ))}
                </div>
              ) : (
                <>
                  <CardGallery
                    cards={paginatedCards}
                    onCardClick={handleGalleryCardClick}
                    minimalMeta
                  />

                  <PaginationControls
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalCards={filteredCards.length}
                    perPage={perPage}
                    isPaginationMode={isPaginationMode}
                    onPageChange={handlePageChange}
                    onPerPageChange={handlePerPageChangeAndScroll}
                  />
                </>
              )}
            </div>
          </>
        )}

        {currentMode === 'deck' && (
          <Suspense fallback={<SectionFallback label="載入組牌工具…" />}>
          <DeckBuilder
            deck={deck}
            poolCards={allCards}
            onRemoveCard={removeFromDeck}
            onCardClick={handleCardClick}
            onAddCard={addToDeck}
            currentRule={currentRule}
            primaryFaction={primaryFaction}
            secondaryFaction={secondaryFaction}
            onSetPrimaryFaction={handleSetPrimaryFaction}
            onSetSecondaryFaction={setSecondaryFaction}
            onApplyRule={applyRuleLogic}
            onClearDeckOnly={clearDeckOnly}
            onClearCategory={clearDeckSection}
            onResetRuleAndClear={resetRuleAndClearDeck}
            savedDecks={savedDecks}
            onSaveDeck={saveDeckAs}
            onLoadDeck={loadSavedDeckByName}
            onDeleteDeck={deleteSavedDeck}
            onShowConfirm={showConfirm}
            onShowToast={showToast}
            onExportText={exportAsText}
            onExportJson={exportAsJson}
            onExportImage={exportDeckAsImage}
            onImportDeck={importDeck}
            onSubmitToShareWall={handleSubmitToShareWall}
            onReorderMain={reorderDeckMain}
            getPoolBlockedCardIds={getPoolBlockedCardIds}
          />
          </Suspense>
        )}

        {currentMode === 'community' && (
          <Suspense fallback={<SectionFallback label="載入交流區…" />}>
            {showDeckDetail && detailShareId ? (
              <DeckShareDetail
                shareId={detailShareId}
                onBack={handleBackToCommunity}
                onLoadDeck={handleLoadShareDeck}
                isLoadingCards={isLoading}
              />
            ) : (
              <CommunitySection
                showToast={showToast}
                onOpenDeck={handleOpenShareDeck}
                initialSection={communityScrollTarget}
              />
            )}
          </Suspense>
        )}

        {currentMode === 'qa' && (
          <Suspense fallback={<SectionFallback label="載入常見問題…" />}>
            <QASection initialCategory={route.kind === 'qa' ? (route.qaCategory ?? '') : ''} />
          </Suspense>
        )}

        {currentMode === 'clock' && (
          <Suspense fallback={<SectionFallback label="載入計時器…" />}>
            <ClockPage />
          </Suspense>
        )}

        {currentMode === 'admin' && (
          <Suspense fallback={<SectionFallback label="載入管理後台…" />}>
            <AdminSection showToast={showToast} showConfirm={showConfirm} />
          </Suspense>
        )}
      </main>

      {selectedCard && (
        <Suspense fallback={null}>
          <CardModal
            card={selectedCard}
            cardList={selectedCardList}
            onClose={handleCloseModal}
            onAdd={addToDeck}
            onPrev={handleModalPrev}
            onNext={handleModalNext}
            isInDeck={deckCardIds.has(selectedCard.id)}
            onViewFactionQA={handleViewFactionQA}
          />
        </Suspense>
      )}

      <AppFooter />
      <ToastList toasts={toasts} />
      <DialogContainer dialogState={dialogState} resolve={resolve} />
      <DeckSubmitModal
        open={deckSubmitOpen}
        isSubmitting={deckSubmitting}
        onClose={closeDeckSubmitModal}
        onSubmit={handleDeckShareSubmit}
      />
      </div>
    </div>
  );
}

export default App;

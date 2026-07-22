import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGridColumnCount } from './hooks/useGridColumnCount.js';
import {
  estimateGalleryMinHeight,
  GALLERY_DEFAULT_PAGE_SIZE,
} from './utils/galleryLayout.js';
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
import { filterCardsByRule } from './rules/index.js';
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
function filtersToQuery(searchTerm, filters) {
  const query = {};
  if (searchTerm.trim()) query.q = searchTerm;
  for (const key of FILTER_KEYS) {
    if (filters[key]) query[key] = filters[key];
  }
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

  const handleModeChange = useCallback((mode) => {
    if (mode === 'community') navigate('community');
    else if (mode === 'admin') navigate('admin');
    else if (mode === 'deck') navigate('deck');
    else if (mode === 'qa') navigate('qa');
    else if (mode === 'clock') navigate('clock');
    else navigate('');
  }, [navigate]);

  const showDeckDetail = route.kind === 'deck-detail';
  const detailShareId = route.kind === 'deck-detail' ? route.shareId : null;
  const communityScrollTarget =
    route.kind === 'community' ? route.communityScroll : undefined;

  // ── 資料層 ────────────────────────────────────────────────────────────────
  const { allCards, isLoading, isError, retry }                         = useCardData();
  const { searchTerm, setSearchTerm, filters, setFilters, handleFilterChange,
          deferredFilteredCards, isFilterPending,
          activeFilterCount, resetFilters }                            = useCardFilters(allCards, {
            searchTerm: initialQuery.q,
            filters: initialQuery,
          });
  const { setCurrentPage, perPage, isPaginationMode,
          totalPages, safePage, paginatedCards, handlePerPageChange }   = usePagination(deferredFilteredCards);
  const galleryColumns = useGridColumnCount();
  const galleryReserveCount = isLoading
    ? (perPage > 0 ? perPage : GALLERY_DEFAULT_PAGE_SIZE)
    : paginatedCards.length;
  const galleryMinHeight = useMemo(
    () => estimateGalleryMinHeight(galleryReserveCount, galleryColumns),
    [galleryReserveCount, galleryColumns],
  );

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

  // ── 組牌模式：套用規則後的卡牌數量（供 FilterToolbar 顯示）────────────────
  const deckFilteredCount = useMemo(() => {
    if (currentMode !== 'deck' || !currentRule.isActive) return deferredFilteredCards.length;
    return filterCardsByRule(deferredFilteredCards, currentRule).length;
  }, [currentMode, deferredFilteredCards, currentRule]);

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
    (card) => handleCardClick(card, deferredFilteredCards),
    [handleCardClick, deferredFilteredCards],
  );

  /**
   * 篩選與卡片彈窗只在查卡／組牌有意義，其餘頁面不把它們寫進網址。
   *
   * 存「模式名或 null」而非布林：gallery↔deck 互切時 navigate 會清掉網址
   * query，若依賴布林（兩模式下都是 true、值不變），同步 effect 不會重跑，
   * 篩選仍在 state 裡生效、網址上卻消失了——此時重新整理就會丟失篩選。
   * 模式名在互切時必然變化，能觸發 effect 把 query 補寫回新路徑。
   */
  const querySyncMode =
    currentMode === 'gallery' || currentMode === 'deck' ? currentMode : null;

  /**
   * 還原網址帶進來的卡片彈窗。只執行一次：之後彈窗的開關由使用者操作決定，
   * 再次比對網址會在關閉當下又把它重新打開。
   * 需等卡牌資料載入才找得到卡，故以 allCards 為觸發條件。
   */
  const restoredCardRef = useRef(false);
  useEffect(() => {
    if (restoredCardRef.current) return;
    const cardId = initialQuery.card;
    if (!cardId) {
      restoredCardRef.current = true;
      return;
    }
    if (allCards.length === 0) return;

    restoredCardRef.current = true;
    const card = allCards.find((item) => item.id === cardId);
    // 找不到（網址帶了不存在的 id）就當作沒有彈窗，不打擾使用者
    if (card) handleCardClick(card, deferredFilteredCards);
  }, [allCards, deferredFilteredCards, handleCardClick, initialQuery]);

  /**
   * 篩選／彈窗 → 網址。單向投影：state 是真相源，網址只反映它，
   * 因此不需要反向監看 query，也就不會有兩邊互相覆寫的迴圈。
   */
  useEffect(() => {
    if (!querySyncMode) return;
    const nextQuery = filtersToQuery(searchTerm, filters);
    if (selectedCard) nextQuery.card = selectedCard.id;
    setQuery(nextQuery);
  }, [querySyncMode, searchTerm, filters, selectedCard, setQuery]);

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

  const backgroundMode =
    currentMode === 'admin' ? 'admin' : currentMode === 'clock' ? 'gallery' : currentMode;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell min-h-screen text-gray-200 font-sans">
      <AppPageBackground activeMode={backgroundMode} />
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
            resultCount={deckFilteredCount}
            activeFilterCount={activeFilterCount}
            onClearFilters={handleClearFilters}
          />
        </div>
      )}

      <MobileFilterDrawer
        searchTerm={searchTerm}
        filters={filters}
        fabVisible={currentMode === 'gallery' || currentMode === 'deck'}
        fabZIndex={currentMode === 'deck' ? 350 : 900}
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
            <div className="text-center mb-8">
              {isLoading ? (
                <p className="text-gray-400 text-lg">載入卡牌資料中…</p>
              ) : (
                <p className="text-brand-gold text-lg font-semibold">
                  找到{' '}
                  <span className={`text-green-400 ${isFilterPending ? 'opacity-60' : ''}`}>
                    {deferredFilteredCards.length}
                  </span>{' '}
                  張符合條件的卡片
                </p>
              )}
            </div>

            <div className="card-gallery-slot" style={{ minHeight: galleryMinHeight }}>
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {Array.from({ length: galleryReserveCount }).map((_, i) => (
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
                    layoutMinHeight={galleryMinHeight}
                    onCardClick={handleGalleryCardClick}
                  />

                  <PaginationControls
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalCards={deferredFilteredCards.length}
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
            filteredCards={deferredFilteredCards}
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
            onClose={closeModal}
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

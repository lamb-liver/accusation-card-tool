import { lazy, Suspense, useCallback, useState, useMemo } from 'react';
import { useGridColumnCount } from './hooks/useGridColumnCount.js';
import {
  estimateGalleryMinHeight,
  GALLERY_DEFAULT_PAGE_SIZE,
} from './utils/galleryLayout.js';
import { TriangleAlert } from 'lucide-react';
import { useCardData }    from './hooks/useCardData.js';
import { useCardFilters } from './hooks/useCardFilters.js';
import { usePagination }  from './hooks/usePagination.js';
import { useDeck }        from './hooks/useDeck.js';
import { useCardModal }   from './hooks/useCardModal.js';
import { useToast }       from './hooks/useToast.js';
import { useDialog }      from './hooks/useDialog.js';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useLayoutInvariant } from './hooks/useLayoutInvariant.js';
import { filterCardsByRule } from './rules/index.js';
import {
  canSubmitDeckToShareWall,
  loadShareWallDeckIntoBuilder,
  submitDeckShareForm,
} from './deck/shareWallHandlers.js';
import { formatShareWallError } from './utils/formatShareWallError.js';
import DeckSubmitModal from './components/shareWall/DeckSubmitModal.jsx';

import FilterToolbar       from './components/FilterToolbar.jsx';
import CardGallery         from './components/CardGallery.jsx';
import PaginationControls  from './components/PaginationControls.jsx';
import MobileFilterDrawer  from './components/MobileFilterDrawer.jsx';
import AppFooter           from './components/AppFooter.jsx';
import ToastList           from './components/ToastList.jsx';
import DialogContainer    from './components/DialogContainer.jsx';
import AppPageBackground  from './components/AppPageBackground.jsx';

const DeckBuilder = lazy(() => import('./components/DeckBuilder.jsx'));
const QASection = lazy(() => import('./components/QASection.jsx'));
const CardModal = lazy(() => import('./components/CardModal.jsx'));
const ShareWallSection = lazy(() => import('./components/shareWall/ShareWallSection.jsx'));
const DeckShareDetail = lazy(() => import('./components/shareWall/DeckShareDetail.jsx'));
const GuestbookSection = lazy(() => import('./components/guestbook/GuestbookSection.jsx'));
const AdminSection = lazy(() => import('./components/admin/AdminSection.jsx'));

function SectionFallback({ label = '載入中…' }) {
  return (
    <div className="flex min-h-48 items-center justify-center text-gray-400" aria-busy="true">
      {label}
    </div>
  );
}

function resolveModeFromRoute(route) {
  if (route.kind === 'admin') return 'admin';
  if (route.kind === 'deck-detail' || route.kind === 'share') return 'share';
  if (route.kind === 'deck') return 'deck';
  if (route.kind === 'guestbook') return 'guestbook';
  if (route.kind === 'qa') return 'qa';
  return 'gallery';
}

function App() {
  const [deckSubmitOpen, setDeckSubmitOpen] = useState(false);
  const [deckSubmitting, setDeckSubmitting] = useState(false);
  const { route, navigate } = useHashRoute();
  const currentMode = resolveModeFromRoute(route);

  const handleModeChange = useCallback((mode) => {
    if (mode === 'share') navigate('decks');
    else if (mode === 'admin') navigate('admin');
    else if (mode === 'deck') navigate('deck');
    else if (mode === 'guestbook') navigate('guestbook');
    else if (mode === 'qa') navigate('qa');
    else navigate('');
  }, [navigate]);

  const showDeckDetail = route.kind === 'deck-detail';
  const detailShareId = route.kind === 'deck-detail' ? route.shareId : null;

  // ── 資料層 ────────────────────────────────────────────────────────────────
  const { allCards, isLoading, isError, retry }                         = useCardData();
  const { searchTerm, setSearchTerm, filters, setFilters,
          handleFilterChange, deferredFilteredCards, isFilterPending } = useCardFilters(allCards);
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
    setDeck,
    currentRule,
    setCurrentRule,
    primaryFaction,   handleSetPrimaryFaction,
    secondaryFaction, setSecondaryFaction, setPrimaryFaction,
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
  } = useDeck(allCards, showToast, showConfirm, showPrompt);

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
      setDeck,
      setCurrentRule,
      setPrimaryFaction,
      setSecondaryFaction,
      showConfirm,
      showToast,
    });
    if (loaded) handleModeChange('deck');
  }, [
    allCards,
    setDeck,
    setCurrentRule,
    setPrimaryFaction,
    setSecondaryFaction,
    showConfirm,
    showToast,
    handleModeChange,
  ]);

  // ── 組牌模式：套用規則後的卡牌數量（供 FilterToolbar 顯示）────────────────
  const deckFilteredCount = useMemo(() => {
    if (currentMode !== 'deck' || !currentRule.isActive) return deferredFilteredCards.length;
    return filterCardsByRule(deferredFilteredCards, currentRule).length;
  }, [currentMode, deferredFilteredCards, currentRule]);

  useLayoutInvariant(currentMode === 'deck', [
    currentMode,
    isLoading,
    deferredFilteredCards.length,
    deckFilteredCount,
  ]);

  // ── Modal 層 ──────────────────────────────────────────────────────────────
  const {
    selectedCard,
    selectedCardList,
    handleCardClick,
    handleModalPrev,
    handleModalNext,
    closeModal,
  } = useCardModal();

  const backgroundMode = currentMode === 'admin' ? 'admin' : currentMode;

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
            onFilterChange={handleFilterChange}
            resultCount={deckFilteredCount}
          />
        </div>
      )}

      <MobileFilterDrawer
        searchTerm={searchTerm}
        filters={filters}
        fabVisible={currentMode === 'gallery' || currentMode === 'deck'}
        onApply={({ searchTerm: nextSearch, filters: nextFilters }) => {
          setSearchTerm(nextSearch);
          setFilters(nextFilters);
        }}
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
                    onCardClick={(card) => handleCardClick(card, deferredFilteredCards)}
                  />

                  <PaginationControls
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalCards={deferredFilteredCards.length}
                    perPage={perPage}
                    isPaginationMode={isPaginationMode}
                    onPageChange={setCurrentPage}
                    onPerPageChange={handlePerPageChange}
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

        {currentMode === 'share' && (
          <Suspense fallback={<SectionFallback label="載入分享牆…" />}>
            {showDeckDetail && detailShareId ? (
              <DeckShareDetail
                shareId={detailShareId}
                onBack={() => navigate('decks')}
                onLoadDeck={handleLoadShareDeck}
                isLoadingCards={isLoading}
              />
            ) : (
              <ShareWallSection onOpenDeck={(shareId) => navigate(`decks/${shareId}`)} />
            )}
          </Suspense>
        )}

        {currentMode === 'guestbook' && (
          <Suspense fallback={<SectionFallback label="載入留言板…" />}>
            <GuestbookSection showToast={showToast} />
          </Suspense>
        )}

        {currentMode === 'qa' && (
          <Suspense fallback={<SectionFallback label="載入常見問題…" />}>
            <QASection />
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
          />
        </Suspense>
      )}

      <AppFooter />
      <ToastList toasts={toasts} />
      <DialogContainer dialogState={dialogState} resolve={resolve} />
      <DeckSubmitModal
        open={deckSubmitOpen}
        isSubmitting={deckSubmitting}
        onClose={() => !deckSubmitting && setDeckSubmitOpen(false)}
        onSubmit={handleDeckShareSubmit}
      />
      </div>
    </div>
  );
}

export default App;

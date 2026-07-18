import { AlertTriangle, ChevronUp } from 'lucide-react';
import DeckRuleConfigurator from './DeckRuleConfigurator.jsx';
import DeckSlotsSection from './DeckSlotsSection.jsx';
import DeckManagerSection from './DeckManagerSection.jsx';
import DeckTransferActions from './DeckTransferActions.jsx';

export default function DeckListPanel({
  bottomSheetOpen,
  onToggleBottomSheet,
  totalCards,
  deck,
  currentRule,
  primaryFaction,
  secondaryFaction,
  ruleSelect,
  onRuleSelectChange,
  onSetPrimaryFaction,
  onSetSecondaryFaction,
  onApplyRule,
  onShowToast,
  onClearDeckOnly,
  onResetRuleAndClear,
  onClearCategory,
  onSortMain,
  onCardClick,
  onRemoveCard,
  mainListRef,
  primaryCount,
  secondaryCount,
  exileCount,
  savedDecks,
  onSaveDeck,
  onLoadDeck,
  onDeleteDeck,
  onExportText,
  onExportJson,
  onExportImage,
  onImportDeck,
  onSubmitToShareWall,
}) {
  return (
    <div
      className={`
        deck-list-section flex flex-col overflow-hidden border-2 border-brand-gold bg-[#252525]
        max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:z-[400] max-lg:rounded-t-2xl
        max-lg:transition-[height] max-lg:duration-300 max-lg:ease-in-out
        ${bottomSheetOpen ? 'max-lg:h-[min(70vh,560px)]' : 'max-lg:h-14'}
        lg:relative lg:z-auto lg:w-[280px] lg:shrink-0 lg:rounded-lg deck-builder-column-lg
      `}
    >
      <button
        type="button"
        onClick={onToggleBottomSheet}
        className="lg:hidden shrink-0 flex items-center justify-between px-4 h-14 w-full border-b border-[#333]"
        aria-expanded={bottomSheetOpen}
        aria-label={bottomSheetOpen ? '收合牌組清單' : '展開牌組清單'}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-brand-gold font-bold text-sm">我的牌組</span>
          <span className={`text-xs font-semibold ${totalCards > 24 ? 'text-red-400' : 'text-green-400'}`}>
            {totalCards}/24
          </span>
          <div className="w-20 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalCards > 24
                  ? 'bg-red-500'
                  : totalCards === 24
                    ? 'bg-brand-gold'
                    : 'bg-brand-gold/70'
              }`}
              style={{ width: `${Math.min((totalCards / 24) * 100, 100)}%` }}
            />
          </div>
        </div>
        <ChevronUp
          className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
            bottomSheetOpen ? '' : 'rotate-180'
          }`}
          aria-hidden
          strokeWidth={2.25}
        />
      </button>

      <div className="deck-list-scroll flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4">
        <h2 className="hidden lg:block text-brand-gold font-bold text-xl">
          我的牌組 (<span className="text-green-400">{totalCards}</span>/24)
        </h2>

        {totalCards > 24 && (
          <div className="limit-warning warning-over flex items-start gap-2 bg-[#8b0000] border-2 border-red-600 text-red-200 p-3 rounded text-sm font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden strokeWidth={2.5} />
            <span>牌組超過上限！</span>
          </div>
        )}

        {deck.main.length > 20 && (
          <div className="limit-warning flex items-start gap-2 bg-[#cc6600] border-2 border-orange-600 text-orange-100 p-3 rounded text-sm font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden strokeWidth={2.5} />
            <span>主牌組超過上限 {deck.main.length - 20} 張！請刪減至20張以內。</span>
          </div>
        )}

        <DeckRuleConfigurator
          currentRule={currentRule}
          ruleSelect={ruleSelect}
          onRuleSelectChange={onRuleSelectChange}
          primaryFaction={primaryFaction}
          secondaryFaction={secondaryFaction}
          onSetPrimaryFaction={onSetPrimaryFaction}
          onSetSecondaryFaction={onSetSecondaryFaction}
          onApplyRule={onApplyRule}
          onShowToast={onShowToast}
          onClearDeckOnly={onClearDeckOnly}
          onResetRuleAndClear={onResetRuleAndClear}
          primaryCount={primaryCount}
          secondaryCount={secondaryCount}
          exileCount={exileCount}
        />

        <DeckSlotsSection
          deck={deck}
          onRemoveCard={onRemoveCard}
          onClearCategory={onClearCategory}
          onSortMain={onSortMain}
          onCardClick={onCardClick}
          mainListRef={mainListRef}
        />

        <DeckManagerSection
          savedDecks={savedDecks}
          onSaveDeck={onSaveDeck}
          onLoadDeck={onLoadDeck}
          onDeleteDeck={onDeleteDeck}
        />

        <DeckTransferActions
          onExportText={onExportText}
          onExportJson={onExportJson}
          onExportImage={onExportImage}
          onImportDeck={onImportDeck}
          onSubmitToShareWall={onSubmitToShareWall}
        />
      </div>
    </div>
  );
}

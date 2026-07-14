import { useCallback, useEffect, useState } from 'react';
import CardGallery from '../CardGallery.jsx';

/** 手機底部 FAB / 安全區留白 */
function useDeckPoolScrollPadding() {
  const [padding, setPadding] = useState(64);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setPadding(mq.matches ? 0 : 64);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return padding;
}

export default function DeckPoolSection({
  hideSelected,
  onHideSelectedChange,
  displayCards,
  onCardClick,
  onAddCard,
  onRemoveCard,
  limitedCardIds,
  inDeckIds,
}) {
  const scrollPaddingBottom = useDeckPoolScrollPadding();

  /** 穩定識別：inline 箭頭會在每次 render 打破 CardGallery/Card 的 memo */
  const handlePoolCardClick = useCallback(
    (card) => onCardClick(card, displayCards),
    [onCardClick, displayCards],
  );

  return (
    <div className="deck-pool-section deck-builder-column-lg flex min-w-0 w-full flex-col overflow-hidden rounded-lg border-2 border-brand-gold bg-[#252525] px-0 py-3 sm:px-4 sm:py-4 lg:min-w-0 lg:flex-1 lg:px-4 lg:py-4 lg:pb-4">
      <div className="deck-pool-header mb-3 flex shrink-0 flex-col items-center gap-2 px-2 sm:px-0">
        <h2 className="text-lg font-bold text-brand-gold">可選卡牌池</h2>
        <label className="flex cursor-pointer select-none items-center gap-2">
          <input
            type="checkbox"
            checked={hideSelected}
            onChange={(event) => onHideSelectedChange(event.target.checked)}
            className="sr-only"
          />
          <div className="relative h-6 w-10">
            <div
              className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                hideSelected ? 'bg-brand-gold' : 'bg-[#444]'
              }`}
            />
            <div
              className={`absolute top-1 h-4 w-4 rounded-full shadow transition-all duration-300 ${
                hideSelected ? 'left-5 bg-black' : 'left-1 bg-white'
              }`}
            />
          </div>
          <span
            className={`text-sm transition-colors duration-300 ${
              hideSelected ? 'font-bold text-brand-gold' : 'text-gray-300'
            }`}
          >
            隱藏已選
          </span>
        </label>
        {displayCards.length > 0 && (
          <p className="text-xs text-gray-400">
            共 {displayCards.length} 張可選 · 在列表內捲動瀏覽
          </p>
        )}
      </div>

      <div
        className="deck-pool-scroll flex min-h-[280px] min-w-0 w-full flex-col overflow-x-hidden overflow-y-auto max-lg:h-[min(60vh,720px)] lg:min-h-0 lg:flex-1"
        style={{ paddingBottom: scrollPaddingBottom }}
      >
        <CardGallery
          cards={displayCards}
          onCardClick={handlePoolCardClick}
          onCardAdd={onAddCard}
          onCardRemove={onRemoveCard}
          limitedCardIds={limitedCardIds}
          inDeckIds={inDeckIds}
          gridClass="grid w-full min-w-0 grid-cols-2 gap-2 *:min-w-0 lg:grid-cols-3 lg:gap-4"
          contained
        />
      </div>
    </div>
  );
}

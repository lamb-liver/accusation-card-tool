import { memo, useCallback } from 'react';
import { Search } from 'lucide-react';
import Card from './Card.jsx';
import { estimateGalleryMinHeight } from '../utils/galleryLayout.js';

/** 僅 LCP 候選需 high priority；其餘 lazy 避免與首圖搶頻寬 */
const FIRST_SCREEN_PRIORITY_COUNT = 1;

function CardGallery({
  cards = [],
  onCardClick = () => {},
  onCardAdd,
  onCardRemove,
  limitedCardIds,
  inDeckIds,
  gridClass,
  layoutMinHeight,
  contained = false,
  footer = null,
  hideImage = false,
}) {
  const handleClick = useCallback(
    (card) => onCardClick(card),
    [onCardClick],
  );
  const reservedHeight = layoutMinHeight ?? estimateGalleryMinHeight(cards.length, 2);

  if (cards.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${
          contained ? 'min-h-0 flex-1 py-8' : 'my-8 min-h-96'
        }`}
        style={contained ? undefined : { minHeight: Math.max(reservedHeight, 384) }}
      >
        <div className="border-4 border-dashed border-brand-gold/30 rounded-lg p-12 text-center max-w-md">
          <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" aria-hidden strokeWidth={1.75} />
          <p className="text-gray-400 text-lg font-medium">找不到符合條件的卡片...</p>
          <p className="text-gray-400 text-sm mt-2">請嘗試調整篩選條件或搜尋關鍵字</p>
        </div>
      </div>
    );
  }

  const grid = (
    <div
      className={
        gridClass ??
        'grid w-full min-w-0 grid-cols-2 gap-4 *:min-w-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      }
      style={contained ? undefined : { minHeight: reservedHeight }}
    >
      {cards.map((card, index) => (
        <Card
          key={card.id}
          card={card}
          onClick={handleClick}
          onAdd={onCardAdd}
          onRemove={onCardRemove}
          isInDeck={inDeckIds ? inDeckIds.has(card.id) : false}
          isAtLimit={limitedCardIds ? limitedCardIds.has(card.id) : false}
          imagePriority={index < FIRST_SCREEN_PRIORITY_COUNT}
          hideImage={hideImage}
        />
      ))}
    </div>
  );

  if (contained) {
    return (
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <div className="min-h-0 w-full">{grid}</div>
        {footer ? <div className="shrink-0 pt-3">{footer}</div> : null}
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full">
      {grid}
      {footer ? <div className="pt-3">{footer}</div> : null}
    </div>
  );
}

export default memo(CardGallery);

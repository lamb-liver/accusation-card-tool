import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Grid, getScrollbarSize, useGridRef } from 'react-window';
import { Search } from 'lucide-react';
import Card from './Card.jsx';
import { useGridColumnCount } from '../hooks/useGridColumnCount.js';
import { estimateGalleryMinHeight, getCardRowHeight } from '../utils/galleryLayout.js';

/** 僅 LCP 候選需 high priority；其餘 lazy 避免與首圖搶頻寬 */
const FIRST_SCREEN_PRIORITY_COUNT = 1;
/** 超過此數量才虛擬化（24 張/頁不啟用，避免與分頁重疊） */
export const VIRTUALIZE_THRESHOLD = 24;

function gridGapForWidth(width) {
  return width > 0 && width < 640 ? 4 : 16;
}

function initialContainerWidth() {
  return 0;
}

function defaultViewportHeight(scrollHeight) {
  return Math.min(scrollHeight, Math.max(400, Math.round(window.innerHeight * 0.7)));
}

/** v2 無 resetAfterIndices；相容 v1 API 並以 scroll 事件觸發 visible range 重算 */
function resetVirtualGrid(gridApi) {
  gridApi?.resetAfterIndices?.({
    rowIndex: 0,
    columnIndex: 0,
    shouldForceUpdate: true,
  });
  gridApi?.recomputeGridSize?.();
  gridApi?.forceUpdate?.();
  const el = gridApi?.element;
  if (!el) return;
  if (el.scrollTop !== 0 || el.scrollLeft !== 0) {
    el.scrollTo({ top: 0, left: 0 });
  }
  el.dispatchEvent(new Event('scroll', { bubbles: true }));
}

/** 量測容器 clientWidth / clientHeight（deck pool 用，不手算 viewport） */
function useContainerClientSize(containerRef, active) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const measureRef = useRef(() => {});

  useLayoutEffect(() => {
    if (!active) {
      setSize({ width: 0, height: 0 });
      return undefined;
    }

    let ro;
    let rafId = 0;

    const attach = () => {
      const el = containerRef?.current;
      if (!el) {
        rafId = requestAnimationFrame(attach);
        return;
      }

      const measure = () => {
        const width = el.clientWidth;
        const height = el.clientHeight;
        if (width <= 0 || height <= 0) {
          rafId = requestAnimationFrame(measure);
          return;
        }
        setSize((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height },
        );
      };

      measureRef.current = measure;
      measure();
      ro = new ResizeObserver(() => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(measure);
      });
      ro.observe(el);
    };

    attach();

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [active, containerRef]);

  return size;
}

function CardGridCell({
  columnIndex,
  rowIndex,
  style,
  cards,
  columnCount,
  gridGap,
  compact,
  onCardClick,
  onCardAdd,
  onCardRemove,
  limitedCardIds,
  inDeckIds,
}) {
  const index = rowIndex * columnCount + columnIndex;
  if (index >= cards.length) return null;

  const card = cards[index];
  const padV = gridGap / 2;
  const padH = compact ? 0 : gridGap / 2;

  return (
    <div
      className="card-list-cell flex h-full max-w-full flex-col overflow-hidden"
      style={{
        ...style,
        padding: `${padV}px ${padH}px`,
        boxSizing: 'border-box',
      }}
    >
      <Card
        card={card}
        onClick={onCardClick}
        onAdd={onCardAdd}
        onRemove={onCardRemove}
        compact={compact}
        isInDeck={inDeckIds ? inDeckIds.has(card.id) : false}
        isAtLimit={limitedCardIds ? limitedCardIds.has(card.id) : false}
        imagePriority={index < FIRST_SCREEN_PRIORITY_COUNT}
      />
    </div>
  );
}

const MemoCardGridCell = memo(CardGridCell);

function CardGallery({
  cards = [],
  onCardClick = () => {},
  onCardAdd,
  onCardRemove,
  limitedCardIds,
  inDeckIds,
  gridClass,
  columnCount: columnCountOverride,
  virtualize,
  layoutMinHeight,
  fillContainer = false,
  layoutContainerRef = null,
  contained = false,
  overscanCount = 2,
  scrollPaddingBottom = 0,
  footer = null,
}) {
  const containerRef = useRef(null);
  const gridRef = useGridRef();
  const [gridSession, setGridSession] = useState(0);
  const poolCardsRef = useRef(cards);
  const [containerWidth, setContainerWidth] = useState(initialContainerWidth);
  const responsiveColumns = useGridColumnCount(columnCountOverride);
  const columnCount = columnCountOverride ?? responsiveColumns;
  const shouldVirtualize = virtualize ?? cards.length > VIRTUALIZE_THRESHOLD;
  const usePoolContainerSize = Boolean(
    fillContainer && layoutContainerRef && shouldVirtualize,
  );
  const containerSize = useContainerClientSize(layoutContainerRef, usePoolContainerSize);

  useLayoutEffect(() => {
    if (!usePoolContainerSize || !shouldVirtualize) return;
    if (poolCardsRef.current === cards) return;
    poolCardsRef.current = cards;
    setGridSession((n) => n + 1);
  }, [cards, shouldVirtualize, usePoolContainerSize]);

  useLayoutEffect(() => {
    if (!usePoolContainerSize || !shouldVirtualize) return;
    const rafId = requestAnimationFrame(() => resetVirtualGrid(gridRef.current));
    return () => cancelAnimationFrame(rafId);
  }, [gridSession, shouldVirtualize, usePoolContainerSize, gridRef]);

  const handleClick = useCallback(
    (card) => onCardClick(card),
    [onCardClick],
  );

  const handleGridResize = useCallback((size) => {
    const width = Math.floor(size.width);
    if (width > 0) {
      setContainerWidth((prev) => (prev === width ? prev : width));
    }
  }, []);

  const measuredWidth = usePoolContainerSize ? containerSize.width : containerWidth;
  const rowHeight = getCardRowHeight(measuredWidth, columnCount);
  const gridGap = gridGapForWidth(measuredWidth);
  const layoutWidth =
    measuredWidth > 0
      ? measuredWidth
      : typeof window !== 'undefined'
        ? window.innerWidth
        : 640;
  const compact = layoutWidth < 640;
  const reservedHeight =
    layoutMinHeight ?? estimateGalleryMinHeight(cards.length, columnCount, rowHeight);

  useLayoutEffect(() => {
    if (!shouldVirtualize || usePoolContainerSize) return;
    const el = containerRef.current;
    if (!el) return;
    const { width } = el.getBoundingClientRect();
    if (width > 0) setContainerWidth(Math.floor(width));
  }, [shouldVirtualize, usePoolContainerSize, cards.length, columnCount]);

  useEffect(() => {
    if (!shouldVirtualize || usePoolContainerSize) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;

    const ro = new ResizeObserver(() => {
      const width = el.clientWidth;
      if (width > 0) setContainerWidth((prev) => (prev === width ? prev : width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [shouldVirtualize, usePoolContainerSize]);

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

  if (shouldVirtualize) {
    const rowCount = Math.ceil(cards.length / columnCount);
    const scrollHeight = rowCount * rowHeight;
    const poolWidth = usePoolContainerSize ? containerSize.width : containerWidth;
    const viewportHeight = usePoolContainerSize
      ? containerSize.height
      : defaultViewportHeight(scrollHeight);
    const scrollbarGutter =
      scrollHeight > viewportHeight ? getScrollbarSize() : 0;
    const safeWidth = poolWidth > 0 ? Math.max(poolWidth - scrollbarGutter, 0) : 0;
    const columnWidth =
      safeWidth > 0 && columnCount > 0 ? Math.floor(safeWidth / columnCount) : 0;
    const grid =
      safeWidth > 0 && viewportHeight > 0 ? (
        <Grid
          key={usePoolContainerSize ? `pool-grid-${gridSession}` : undefined}
          gridRef={usePoolContainerSize ? gridRef : undefined}
          cellComponent={MemoCardGridCell}
          cellProps={{
            cards,
            columnCount,
            gridGap,
            compact,
            onCardClick: handleClick,
            onCardAdd,
            onCardRemove,
            limitedCardIds,
            inDeckIds,
          }}
          columnCount={columnCount}
          columnWidth={columnWidth}
          rowCount={rowCount}
          rowHeight={rowHeight}
          defaultHeight={viewportHeight}
          defaultWidth={safeWidth}
          overscanCount={overscanCount}
          onResize={usePoolContainerSize ? undefined : handleGridResize}
          className="card-gallery-grid h-full min-h-0 w-full max-w-full flex-1"
          style={{
            height: viewportHeight,
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden',
            overflowY: 'auto',
            paddingBottom: scrollPaddingBottom,
            boxSizing: 'border-box',
          }}
        />
      ) : null;

    if (fillContainer) {
      return (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
          {grid}
          {footer ? <div className="shrink-0">{footer}</div> : null}
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="card-gallery-viewport min-w-0 w-full max-w-full overflow-x-hidden"
        style={{ height: viewportHeight }}
      >
        {grid}
        {footer ? <div className="pt-3">{footer}</div> : null}
      </div>
    );
  }

  const grid = (
    <div
      ref={containerRef}
      className={
        gridClass ??
        'grid w-full min-w-0 grid-cols-2 gap-4 *:min-w-0 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
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
        />
      ))}
    </div>
  );

  if (contained) {
    return (
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
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

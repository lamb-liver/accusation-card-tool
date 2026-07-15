import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { ChevronLeft, ChevronRight, List, Minus, Plus } from 'lucide-react';
import OptimizedImage from './common/OptimizedImage.jsx';
import { SYMBOL_ICONS } from '../constants/symbols.js';
import {
  CARD_ART_CHANGED_EVENT,
  CARD_GALLERY_SIZES,
  CARD_IMAGE_DEFAULT_WIDTH,
  cardHasAlternateArt,
  getCardArtVariants,
  getCardImageAvifSrc,
  getCardPictureSources,
  getStoredArtVariant,
  getVariantSource,
  setStoredArtVariant,
  variantBadgeLabel,
} from '../utils/cardAlternateArt.js';
import { getCardMetaCells, getCardStats, CARD_STAT_COLORS } from '../utils/cardMeta.js';

function Card({
  card,
  onClick = () => {},
  onAdd,
  onRemove,
  isInDeck = false,
  isAtLimit = false,
  imagePriority = false,
  compact = false,
}) {
  const [artRev, setArtRev] = useState(0);
  const imageRootRef = useRef(null);

  const hasAlt = cardHasAlternateArt(card);
  const artVariants = useMemo(() => getCardArtVariants(card), [card]);
  const artVariant = hasAlt ? getStoredArtVariant(card.id, artVariants) : 'main';
  const variantIdx = artVariants.indexOf(artVariant);
  const picture = useMemo(
    () => getCardPictureSources(card.id, artVariant),
    [card.id, artVariant],
  );
  const imageSrc = imagePriority
    ? getCardImageAvifSrc(card.id, artVariant, CARD_IMAGE_DEFAULT_WIDTH)
    : picture.fallbackSrc;
  const displaySource = getVariantSource(card, artVariant);

  useEffect(() => {
    const onArtChange = (e) => {
      if (e.detail?.cardId === card.id) setArtRev((n) => n + 1);
    };
    window.addEventListener(CARD_ART_CHANGED_EVENT, onArtChange);
    return () => window.removeEventListener(CARD_ART_CHANGED_EVENT, onArtChange);
  }, [card.id]);

  const stats = useMemo(() => getCardStats(card), [card]);
  const metaCells = useMemo(() => getCardMetaCells(card), [card]);
  const statColors = CARD_STAT_COLORS;

  const tagCellClass = compact
    ? 'min-h-6 flex items-center justify-center px-1 py-0.5 rounded border-2 border-solid text-[10px] font-bold text-center leading-tight'
    : 'min-h-9 flex items-center justify-center px-1.5 py-1 rounded-md border-2 border-solid text-[11px] font-bold text-center leading-snug';

  const statGridClass = stats.length <= 1 ? 'grid-cols-1' : 'grid-cols-2';

  const handleClick = useCallback(() => onClick(card), [onClick, card]);

  const handleAdd = useCallback((e) => {
    e.stopPropagation();
    if (!isInDeck && !isAtLimit && onAdd) onAdd(card);
  }, [onAdd, card, isInDeck, isAtLimit]);

  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    if (onRemove) onRemove(card.id);
  }, [onRemove, card.id]);

  const showActionButton = onAdd !== undefined || isInDeck;

  const cardImageAlt =
    artVariant !== 'main' && hasAlt
      ? `卡牌「${card.name}」異畫（WebP，${card.faction}，${card.type}）`
      : `卡牌「${card.name}」封面圖（WebP，${card.faction}，${card.type}）`;

  const handleArtPrev = useCallback(
    (e) => {
      e.stopPropagation();
      if (variantIdx <= 0) return;
      setStoredArtVariant(card.id, artVariants[variantIdx - 1]);
    },
    [variantIdx, artVariants, card.id],
  );

  const handleArtNext = useCallback(
    (e) => {
      e.stopPropagation();
      if (variantIdx < 0 || variantIdx >= artVariants.length - 1) return;
      setStoredArtVariant(card.id, artVariants[variantIdx + 1]);
    },
    [variantIdx, artVariants, card.id],
  );

  const alignActionBar = compact && showActionButton;

  return (
    <div
      className={`card-shell group relative flex min-w-0 flex-col overflow-hidden rounded-lg ${
        alignActionBar ? 'h-full' : compact ? 'h-auto' : 'h-full'
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={`查看卡牌：${card.name}`}
        className={`block w-full cursor-pointer bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
          alignActionBar ? 'min-h-0 flex-1' : compact ? 'shrink-0' : 'min-h-0 flex-1'
        } ${showActionButton ? 'rounded-t-lg' : 'rounded-lg'}`}
      >
        <div
          className={`card-face relative flex flex-col overflow-hidden border-2 border-gray-600 bg-black shadow-lg transition-[border-color,box-shadow] duration-300 group-hover:border-brand-gold group-hover:shadow-brand-gold/50 focus-visible:border-brand-gold ${
            alignActionBar ? 'h-full min-h-0' : compact ? 'shrink-0' : 'h-full min-h-0'
          } ${showActionButton ? 'rounded-t-lg border-b-0' : 'rounded-lg'}`}
        >
          <div
            ref={imageRootRef}
            className="card-image-slot card-image-slot--contain relative w-full shrink-0 overflow-hidden bg-black"
          >
            <OptimizedImage
              src={imageSrc}
              webpSrcSet={picture.webpSrcSet}
              avifSrcSet={picture.avifSrcSet}
              sizes={CARD_GALLERY_SIZES}
              alt={cardImageAlt}
              imgKey={`${card.id}-${artVariant}-${artRev}`}
              priority={imagePriority}
              rootRef={imageRootRef}
              className="card-image-media touch-manipulation select-none"
              placeholderClassName="absolute inset-0 animate-pulse bg-black"
            />
          </div>

          <div
            className={
              alignActionBar
                ? 'flex min-h-0 flex-1 flex-col'
                : `relative flex flex-col bg-black ${
                    compact ? 'shrink-0 gap-1 p-2' : 'min-h-0 grow gap-2 p-3'
                  }`
            }
          >
            <div
              data-card-info
              className={
                alignActionBar
                  ? 'relative flex shrink-0 flex-col gap-1 bg-black p-1.5'
                  : 'contents'
              }
            >
            <p
              className={`line-clamp-2 font-bold text-white transition group-hover:text-amber-300 ${
                compact ? 'text-xs leading-tight' : 'text-sm leading-snug'
              }`}
            >
              {card.name}
            </p>

            <div
              className={`grid w-full shrink-0 gap-1 ${metaCells.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}
            >
              {metaCells.map((cell) => (
                <div
                  key={`${card.id}-${cell.key}`}
                  className={`${tagCellClass} ${cell.className}`}
                >
                  <span className="break-words">{cell.content}</span>
                </div>
              ))}
            </div>

            <div
              className={
                compact
                  ? 'shrink-0'
                  : 'flex min-h-9 flex-1 flex-col justify-start gap-1 overflow-hidden'
              }
            >
              {card.symbols && card.symbols.length > 0 ? (
                <div
                  className={`grid w-full gap-1 ${
                    compact
                      ? 'grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))]'
                      : 'grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))]'
                  }`}
                >
                  {card.symbols.map((symbol, idx) => (
                    <div
                      key={`${card.id}-symbol-${idx}`}
                      className={`${tagCellClass} border-amber-500/55 bg-amber-950/35 font-semibold text-amber-100 gap-0.5`}
                    >
                      {SYMBOL_ICONS[symbol] && (
                        <img
                          src={SYMBOL_ICONS[symbol]}
                          alt={`符號「${symbol}」圖示`}
                          loading="lazy"
                          decoding="async"
                          className="w-3 h-3 object-contain shrink-0"
                        />
                      )}
                      <span className="break-words">{symbol}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {stats.length > 0 && (
              <div className={`grid w-full shrink-0 gap-1 ${statGridClass}`}>
                {stats.map((stat, idx) => (
                  <div
                    key={`${card.id}-stat-${idx}`}
                    className={`flex flex-col items-center justify-center gap-0 rounded-md border border-solid text-center ${
                      compact ? 'min-h-5 px-1 py-0' : 'min-h-8 px-1.5 py-1'
                    } ${
                      statColors[stat.label] ||
                      'border-neutral-600 bg-black text-neutral-200'
                    }`}
                  >
                    <span className="text-[9px] leading-none opacity-85">
                      {stat.label}
                    </span>
                    <span className="text-xs font-bold tabular-nums leading-none">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {displaySource && !compact && (
              <div className="shrink-0 pt-0.5 flex items-center justify-end gap-1 text-[10px] leading-none text-gray-400">
                <List className="h-2.5 w-2.5 shrink-0" aria-hidden strokeWidth={2.25} />
                <span>取得方式：{displaySource}</span>
              </div>
            )}
            </div>
            {alignActionBar && (
              <div data-card-body-spacer className="min-h-0 flex-1 bg-black" aria-hidden />
            )}
          </div>
        </div>
      </button>

      {hasAlt && (
        <>
          {artVariant !== 'main' && (
            <div
              className="pointer-events-none absolute right-1.5 top-1.5 z-20 rounded border border-amber-600/80 bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200"
              aria-hidden
            >
              {variantBadgeLabel(artVariant)}
            </div>
          )}
          {/* 半透明膠囊、只渲染可用方向：減少對卡框左上裝飾的遮擋 */}
          <div
            className={`absolute z-20 flex items-center overflow-hidden rounded-full border border-neutral-600/60 bg-black/60 backdrop-blur-[2px] ${
              compact ? '-left-1 top-0.5' : 'left-1 top-1'
            }`}
          >
            {variantIdx > 0 && (
              <button
                type="button"
                onClick={handleArtPrev}
                aria-label="切換上一個圖版"
                className={`flex items-center justify-center text-amber-200 transition hover:bg-black/60 hover:text-brand-gold ${
                  compact ? 'h-5 w-5' : 'h-6 w-6'
                }`}
              >
                <ChevronLeft
                  className={`shrink-0 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
                  aria-hidden
                  strokeWidth={2.75}
                />
              </button>
            )}
            {variantIdx < artVariants.length - 1 && (
              <button
                type="button"
                onClick={handleArtNext}
                aria-label="切換下一個圖版"
                className={`flex items-center justify-center text-amber-200 transition hover:bg-black/60 hover:text-brand-gold ${
                  compact ? 'h-5 w-5' : 'h-6 w-6'
                }`}
              >
                <ChevronRight
                  className={`shrink-0 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
                  aria-hidden
                  strokeWidth={2.75}
                />
              </button>
            )}
          </div>
        </>
      )}

      {showActionButton && (
        <button
          type="button"
          onClick={isInDeck ? handleRemove : handleAdd}
          disabled={!isInDeck && isAtLimit}
          aria-label={isInDeck ? `移除 ${card.name}` : `加入 ${card.name} 到牌組`}
          className={`card-action-button z-10 flex w-full shrink-0 items-center justify-center border-2 border-t-0 border-gray-600 font-bold rounded-b-lg transition-colors duration-200 group-hover:border-brand-gold
            ${compact ? 'gap-1 py-2 text-[10px]' : 'gap-1.5 py-2.5 text-xs'}
            ${isInDeck
              ? 'bg-red-900 hover:bg-red-800 text-red-200 cursor-pointer active:scale-95'
              : isAtLimit
                ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                : 'bg-brand-gold hover:bg-amber-400 text-neutral-900 cursor-pointer active:scale-95'
            }`}
        >
          {isInDeck ? (
            <>
              <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2.75} />
              <span>移除</span>
            </>
          ) : isAtLimit ? (
            <span>已達上限</span>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2.75} />
              <span>加入</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default memo(Card);

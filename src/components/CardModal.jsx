import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  List,
  Plus,
  X,
} from 'lucide-react';
import OptimizedImage from './common/OptimizedImage.jsx';
import { SYMBOL_ICONS } from '../constants/symbols.js';
import {
  CARD_ART_CHANGED_EVENT,
  CARD_MODAL_SIZES,
  cardHasAlternateArt,
  getCardArtVariants,
  getCardImageFullSrc,
  getCardPictureSources,
  getStoredArtVariant,
  getVariantSource,
  setStoredArtVariant,
  variantBadgeLabel,
} from '../utils/cardAlternateArt.js';
import { cancelScheduledPrefetch, schedulePrefetch } from '../utils/imageHints.js';

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function CardModal({
  card,
  cardList = [],
  onClose = () => {},
  onAdd = () => {},
  onPrev = () => {},
  onNext = () => {},
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [artRev, setArtRev] = useState(0);
  const dialogRef = useRef(null);
  const titleId = 'card-modal-title';

  const hasAlt = card ? cardHasAlternateArt(card) : false;
  const artVariants = useMemo(() => (card ? getCardArtVariants(card) : ['main']), [card]);
  const artVariant = hasAlt ? getStoredArtVariant(card.id, artVariants) : 'main';
  const variantIdx = artVariants.indexOf(artVariant);
  const picture = useMemo(
    () => (card ? getCardPictureSources(card.id, artVariant) : null),
    [card, artVariant],
  );
  const displaySource = getVariantSource(card, artVariant);

  useEffect(() => {
    const onArtChange = () => setArtRev((n) => n + 1);
    window.addEventListener(CARD_ART_CHANGED_EVENT, onArtChange);
    return () => window.removeEventListener(CARD_ART_CHANGED_EVENT, onArtChange);
  }, []);

  useEffect(() => {
    setImgLoaded(false);
  }, [card?.id, artVariant, artRev]);

  // 開啟時自動聚焦到對話框，並儲存原本焦點以供關閉後還原
  useEffect(() => {
    if (!card) return;
    const prev = document.activeElement;
    const el = dialogRef.current?.querySelector(FOCUSABLE_SELECTORS);
    el?.focus();
    return () => { prev?.focus(); };
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- 僅在換卡 id 時重設焦點

  // ==========================================
  // ✨ 完美的 A11y 攔截與背景滾動鎖定邏輯
  // ==========================================
  useEffect(() => {
    if (!card) return;

    // 1. 鎖定背景滾動
    document.body.style.overflow = 'hidden';

    // 2. 監聽 ESC 鍵關閉 (全局監聽，防呆保護)
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      // 3. 關閉時還原背景滾動與移除監聽
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [card, onClose]);

  const currentIdx = card ? cardList.findIndex((c) => c.id === card.id) : -1;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < cardList.length - 1;
  const prevCard = hasPrev ? cardList[currentIdx - 1] : null;
  const nextCard = hasNext ? cardList[currentIdx + 1] : null;

  const prefetchNeighbor = useCallback((neighbor) => {
    if (!neighbor) return;
    const variant = cardHasAlternateArt(neighbor)
      ? getStoredArtVariant(neighbor.id, getCardArtVariants(neighbor))
      : 'main';
    schedulePrefetch(getCardImageFullSrc(neighbor.id, variant));
  }, []);

  useEffect(() => {
    if (!card || !hasNext || !nextCard) return undefined;
    prefetchNeighbor(nextCard);
    return cancelScheduledPrefetch;
  }, [card, hasNext, nextCard, prefetchNeighbor]);

  if (!card) return null;

  const handleArtPrev = (e) => {
    e.stopPropagation();
    if (variantIdx <= 0) return;
    setStoredArtVariant(card.id, artVariants[variantIdx - 1]);
  };

  const handleArtNext = (e) => {
    e.stopPropagation();
    if (variantIdx < 0 || variantIdx >= artVariants.length - 1) return;
    setStoredArtVariant(card.id, artVariants[variantIdx + 1]);
  };

  // 鍵盤左右鍵切換 + 焦點陷阱 (Tab)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft' && hasPrev) { onPrev(); return; }
    if (e.key === 'ArrowRight' && hasNext) { onNext(); return; }
    // 這裡保留 Escape 作為雙重保險
    if (e.key === 'Escape') { onClose(); return; } 
    if (e.key !== 'Tab') return;
    
    const focusable = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTORS) ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- 全螢幕 modal 遮罩點擊關閉
    <div
      className="fixed inset-0 z-[1200] bg-black/85 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative bg-neutral-800 border-2 border-brand-gold rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* 關閉按鈕 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-gray-600 bg-neutral-700 text-gray-300 transition hover:border-brand-gold hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-brand-gold"
        >
          <X className="h-4 w-4" aria-hidden strokeWidth={2.25} />
        </button>

        <div className="p-6">

          {/* 卡片圖片 */}
          <div className="relative mb-2">
            {hasAlt && (
              <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
                {artVariant !== 'main' && (
                  <span
                    className="pointer-events-none rounded border border-amber-600/80 bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200"
                    aria-hidden
                  >
                    {variantBadgeLabel(artVariant)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleArtPrev}
                  disabled={variantIdx <= 0}
                  aria-label="切換上一個圖版"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-neutral-500 bg-black/70 text-amber-200 shadow-md transition hover:border-brand-gold hover:text-brand-gold disabled:pointer-events-none disabled:opacity-35"
                >
                  <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2.75} />
                </button>
                <button
                  type="button"
                  onClick={handleArtNext}
                  disabled={variantIdx >= artVariants.length - 1}
                  aria-label="切換下一個圖版"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-neutral-500 bg-black/70 text-amber-200 shadow-md transition hover:border-brand-gold hover:text-brand-gold disabled:pointer-events-none disabled:opacity-35"
                >
                  <ChevronRight className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2.75} />
                </button>
              </div>
            )}
            {/* 骨架佔位：載入中顯示 */}
            <div className="card-image-slot card-image-slot--contain relative mx-auto w-full max-w-sm">
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center rounded bg-neutral-700 animate-pulse" aria-hidden>
                  <ImageIcon className="h-12 w-12 text-neutral-500" strokeWidth={1.5} />
                </div>
              )}
              {picture && (
                <OptimizedImage
                  src={picture.fallbackSrc}
                  webpSrcSet={picture.webpSrcSet}
                  avifSrcSet={picture.avifSrcSet}
                  sizes={CARD_MODAL_SIZES}
                  imgKey={`${card.id}-${artVariant}-${artRev}`}
                  priority
                  awaitDecode
                  alt={
                    artVariant !== 'main' && hasAlt
                      ? `卡牌「${card.name}」異畫（WebP，${card.faction}，${card.type}）`
                      : `卡牌「${card.name}」大圖（WebP，${card.faction}，${card.type}）`
                  }
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgLoaded(true)}
                  className={`card-image-media object-contain rounded touch-manipulation select-none transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
              )}
            </div>
          </div>

          {/* 卡名 */}
          <h2 id={titleId} className="mb-2 text-2xl font-bold text-brand-gold">{card.name}</h2>

          {/* 基本屬性 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-gray-400 text-sm">教團</p>
              <p className="text-white font-semibold">{card.faction}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">種類</p>
              <p className="text-white font-semibold">{card.type}</p>
            </div>
            {card.volume !== undefined && (
              <div>
                <p className="text-gray-400 text-sm">聲量</p>
                <p className="text-white font-semibold">{card.volume}</p>
              </div>
            )}
            {card.guard !== undefined && (
              <div>
                <p className="text-gray-400 text-sm">守護</p>
                <p className="text-white font-semibold">{card.guard}</p>
              </div>
            )}
            {card.calamity !== undefined && (
              <div>
                <p className="text-gray-400 text-sm">災厄</p>
                <p className="text-white font-semibold">{card.calamity}</p>
              </div>
            )}
            {card.stardust !== undefined && (
              <div>
                <p className="text-gray-400 text-sm">星塵</p>
                <p className="text-white font-semibold">{card.stardust}</p>
              </div>
            )}
            {card.locationType && (
              <div>
                <p className="text-gray-400 text-sm">地點類型</p>
                <p className="text-white font-semibold">{card.locationType}</p>
              </div>
            )}
          </div>

          {/* 效果描述 */}
          {card.effect && (
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">效果：</p>
              <div className="bg-neutral-700/50 p-4 rounded border border-gray-600">
                <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{card.effect}</p>
              </div>
              {/* 取得方式 — 效果框右下角 */}
              {displaySource && (
                <div className="flex items-center justify-end gap-1.5 mt-2 text-xs text-gray-400">
                  <List className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2.25} />
                  <span>取得方式：{displaySource}</span>
                </div>
              )}
            </div>
          )}

          {/* 若無效果但有來源，單獨顯示取得方式 */}
          {!card.effect && displaySource && (
            <div className="flex items-center gap-1.5 mb-4 text-xs text-gray-400">
              <List className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2.25} />
              <span>取得方式：{displaySource}</span>
            </div>
          )}

          {/* 符號（含 icon） */}
          {card.symbols && card.symbols.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">符號</p>
              <div className="flex flex-wrap gap-2">
                {card.symbols.map((symbol, idx) => (
                  <span
                    key={`${card.id}-symbol-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/20 text-amber-300 text-sm rounded border border-brand-gold/50 font-medium"
                  >
                    {SYMBOL_ICONS[symbol] && (
                      <img src={SYMBOL_ICONS[symbol]} alt={symbol} className="w-4 h-4 object-contain" />
                    )}
                    {symbol}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 加入牌組 + 左右切換同一行 */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {cardList.length > 1 ? (
              <button
                type="button"
                onClick={onPrev}
                onMouseEnter={() => prefetchNeighbor(prevCard)}
                onFocus={() => prefetchNeighbor(prevCard)}
                disabled={!hasPrev}
                className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-brand-gold bg-black/60 text-brand-gold transition hover:bg-brand-gold hover:text-black disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                aria-label="上一張"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden strokeWidth={2.5} />
              </button>
            ) : null}

            <button
              onClick={() => onAdd(card)}
              className="inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-amber-500 text-neutral-900 font-bold py-3 px-10 rounded-full transition text-base"
            >
              <Plus className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2.75} />
              加入牌組
            </button>

            {cardList.length > 1 ? (
              <button
                type="button"
                onClick={onNext}
                onMouseEnter={() => prefetchNeighbor(nextCard)}
                onFocus={() => prefetchNeighbor(nextCard)}
                disabled={!hasNext}
                className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-brand-gold bg-black/60 text-brand-gold transition hover:bg-brand-gold hover:text-black disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                aria-label="下一張"
              >
                <ChevronRight className="h-6 w-6" aria-hidden strokeWidth={2.5} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Image as ImageIcon,
  List,
  Plus,
  X,
} from 'lucide-react';
import OptimizedImage from './common/OptimizedImage.jsx';
import { SYMBOL_ICONS } from '../constants/symbols.js';
import { formatCardNumber } from '../utils/cardMeta.js';
import { getMechanicNotes } from '../constants/mechanicGlossary.js';
import { factionHasQA } from '../utils/qaLookup.js';
import {
  CARD_ART_CHANGED_EVENT,
  CARD_MODAL_SIZES,
  cardHasAlternateArt,
  getCardArtVariants,
  getCardPictureSources,
  getStoredArtVariant,
  getVariantSource,
  setStoredArtVariant,
  variantBadgeLabel,
} from '../utils/cardAlternateArt.js';

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function CardModal({
  card,
  cardList = [],
  onClose = () => {},
  onAdd = () => {},
  onPrev = () => {},
  onNext = () => {},
  isInDeck = false,
  onViewFactionQA = () => {},
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [artRev, setArtRev] = useState(0);
  const dialogRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, ignore: false });
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
  if (!card) return null;

  const metadata = [
    ['教團', card.faction],
    ['種類', card.type],
    ['聲量', card.volume],
    ['守護', card.guard],
    ['災厄', card.calamity],
    ['星塵', card.stardust],
    ['地點', card.locationType],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');

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

  // 手機左右滑動切換上/下一張；只攔水平位移明顯大於垂直的手勢，避免干擾內容捲動。
  // 起點落在按鈕等互動元件時忽略手勢，否則按著「加入牌組」橫移會誤換卡。
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    const fromControl = Boolean(e.target?.closest?.('button, a, input, select, textarea'));
    touchStartRef.current = { x: t.clientX, y: t.clientY, ignore: fromControl };
  };
  const handleTouchEnd = (e) => {
    if (touchStartRef.current.ignore) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && hasNext) onNext();
    else if (dx > 0 && hasPrev) onPrev();
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative mx-3 max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-brand-gold/30 bg-[#171614] shadow-2xl lg:overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/65 text-stone-300 shadow-lg backdrop-blur transition hover:border-brand-gold hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-brand-gold"
        >
          <X className="h-4 w-4" aria-hidden strokeWidth={2.25} />
        </button>

        <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)]">
          <div className="relative flex items-center justify-center bg-black/35 p-5 sm:p-8 lg:min-h-[min(88vh,46rem)] lg:border-r lg:border-white/10">
            {hasAlt && (
              <div className="absolute left-3 top-3 z-10 flex items-center gap-1">
                {artVariant !== 'main' && (
                  <span
                    className="pointer-events-none rounded border border-brand-gold/35 bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-gold"
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
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 text-stone-300 shadow-md transition hover:border-brand-gold hover:text-brand-gold disabled:pointer-events-none disabled:opacity-35"
                >
                  <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={handleArtNext}
                  disabled={variantIdx >= artVariants.length - 1}
                  aria-label="切換下一個圖版"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 text-stone-300 shadow-md transition hover:border-brand-gold hover:text-brand-gold disabled:pointer-events-none disabled:opacity-35"
                >
                  <ChevronRight className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2.25} />
                </button>
              </div>
            )}
            <div className="card-image-slot card-image-slot--contain relative mx-auto w-full max-w-sm shadow-[0_24px_70px_rgba(0,0,0,0.62),0_0_28px_rgba(209,179,95,0.08)]">
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center rounded bg-neutral-700 animate-pulse" aria-hidden>
                  <ImageIcon className="h-12 w-12 text-neutral-500" strokeWidth={2.25} />
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
                  className={`card-image-media touch-manipulation select-none rounded-sm object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col p-5 sm:p-7 lg:max-h-[92vh] lg:overflow-y-auto">
            <header className="mb-4 border-b border-white/10 pb-4 pr-10">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h2 id={titleId} className="font-display text-2xl font-bold text-brand-gold sm:text-3xl">
                  {card.name}
                </h2>
                <span className="font-mono text-xs text-stone-500" aria-label={`卡牌編號 ${formatCardNumber(card.id)}`}>
                  {formatCardNumber(card.id)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs tracking-[0.08em]">
                {metadata.map(([label, value]) => (
                  <span key={label} className="inline-flex items-baseline gap-1.5">
                    <span className="text-[10px] text-stone-500">{label}</span>
                    <strong className="font-semibold text-stone-200">{value}</strong>
                  </span>
                ))}
              </div>
            </header>

            {card.effect && (
              <section className="mb-5" aria-labelledby="card-effect-title">
                <h3 id="card-effect-title" className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-stone-500">
                  卡牌效果
                </h3>
                <div className="border-y border-white/10 py-4">
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-stone-200">{card.effect}</p>
                </div>
                {getMechanicNotes(card.effect).map(({ term, description }) => (
                  <div
                    key={term}
                    className="mt-3 flex gap-2 border-l border-brand-gold/35 pl-3 text-xs leading-relaxed text-stone-300"
                  >
                    <span className="shrink-0 font-bold text-brand-gold">{term}</span>
                    <span>{description}</span>
                  </div>
                ))}
              </section>
            )}

            {card.symbols && card.symbols.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[11px] font-semibold tracking-[0.18em] text-stone-500">符號</span>
                {card.symbols.map((symbol, idx) => (
                  <span
                    key={`${card.id}-symbol-${idx}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-300"
                  >
                    {SYMBOL_ICONS[symbol] && (
                      <img src={SYMBOL_ICONS[symbol]} alt="" className="h-4 w-4 object-contain" />
                    )}
                    {symbol}
                  </span>
                ))}
              </div>
            )}

            {displaySource && (
              <div className="mb-5 flex items-center gap-1.5 text-xs text-stone-500">
                <List className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2.25} />
                <span>取得方式：{displaySource}</span>
              </div>
            )}

            {factionHasQA(card.faction) && (
              <button
                type="button"
                onClick={() => onViewFactionQA(card.faction)}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-stone-300 transition hover:border-brand-gold hover:text-brand-gold"
              >
                <HelpCircle className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
                查看「{card.faction}」常見問題
              </button>
            )}

            <div className="mt-auto flex items-center justify-center gap-3 pt-1">
              {cardList.length > 1 ? (
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!hasPrev}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-stone-300 transition hover:border-brand-gold hover:text-brand-gold disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="上一張"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden strokeWidth={2.25} />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => onAdd(card)}
                disabled={isInDeck}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-base font-bold transition ${
                  isInDeck
                    ? 'cursor-not-allowed border border-green-500/40 bg-green-950/30 text-green-300'
                    : 'bg-brand-gold-bright text-neutral-900 hover:bg-amber-300'
                }`}
              >
                {isInDeck ? (
                  <>
                    <Check className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2.25} />
                    已在牌組
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 shrink-0" aria-hidden strokeWidth={2.25} />
                    加入牌組
                  </>
                )}
              </button>

              {cardList.length > 1 ? (
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-stone-300 transition hover:border-brand-gold hover:text-brand-gold disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="下一張"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden strokeWidth={2.25} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

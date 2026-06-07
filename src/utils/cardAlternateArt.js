const STORAGE_KEY = 'accusation-card-art-variant';
export const CARD_ART_CHANGED_EVENT = 'accusation:card-art-changed';

/** 與 scripts/optimize-images.mjs 同步（對齊實際卡槽 ~178px；DPR3 ≈ 534 → 選 640w） */
export const CARD_IMAGE_WIDTHS = [160, 320, 640];
export const CARD_IMAGE_DEFAULT_WIDTH = 320;
export const CARD_IMAGE_MODAL_WIDTH = 640;

/** 與 grid 欄寬一致，避免 sizes 高估導致 browser 選到過大 src */
export const CARD_GALLERY_SIZES =
  '(max-width: 640px) 42vw, (max-width: 1024px) 180px, 200px';
export const CARD_MODAL_SIZES = '(max-width: 768px) min(90vw, 384px), 384px';

/** 有異畫的卡必須同時具備 alternateSource（與主圖 source 可分開） */
export function cardHasAlternateArt(card) {
  return Boolean(
    card?.hasAlternateArt &&
    typeof card.alternateSource === 'string' &&
    card.alternateSource.trim() !== '',
  );
}

function cardBaseName(cardId, variant) {
  return variant === 'alt' ? `${cardId}alt` : cardId;
}

/** 單一寬度 URL；無響應式檔時 fallback 原圖 */
export function getCardImageSrc(cardId, variant, width = CARD_IMAGE_DEFAULT_WIDTH) {
  const base = cardBaseName(cardId, variant);
  if (width) return `images/${base}-w${width}.webp`;
  return `images/${base}.webp`;
}

/** LCP 用：與 index.html preload 同一檔，避免 priority 卡再去抓大張 fallback webp */
export function getCardImageAvifSrc(cardId, variant, width = CARD_IMAGE_DEFAULT_WIDTH) {
  const base = cardBaseName(cardId, variant);
  return `images/${base}-w${width}.avif`;
}

/** 匯出／全尺寸用途 */
export function getCardImageFullSrc(cardId, variant) {
  const base = cardBaseName(cardId, variant);
  return `images/${base}-w${CARD_IMAGE_MODAL_WIDTH}.webp`;
}

function buildSrcSet(base, ext, widths = CARD_IMAGE_WIDTHS) {
  return widths.map((w) => `images/${base}-w${w}.${ext} ${w}w`).join(', ');
}

export function getCardPictureSources(cardId, variant) {
  const base = cardBaseName(cardId, variant);
  return {
    webpSrcSet: buildSrcSet(base, 'webp'),
    avifSrcSet: buildSrcSet(base, 'avif'),
    /** 主圖：響應式檔不存在時仍可顯示 */
    fallbackSrc: `images/${base}.webp`,
    fullSrc: getCardImageFullSrc(cardId, variant),
  };
}

export function getStoredArtVariant(cardId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[cardId] === 'alt' ? 'alt' : 'main';
  } catch {
    return 'main';
  }
}

export function setStoredArtVariant(cardId, variant) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (variant === 'main') delete map[cardId];
    else map[cardId] = 'alt';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new CustomEvent(CARD_ART_CHANGED_EVENT, { detail: { cardId } }));
}

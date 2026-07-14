const STORAGE_KEY = 'accusation-card-art-variant';
export const CARD_ART_CHANGED_EVENT = 'accusation:card-art-changed';

/** 響應式寬度唯一來源（scripts/optimize-images.mjs 直接 import）；對齊實際卡槽 ~178px；DPR3 ≈ 534 → 選 640w */
export const CARD_IMAGE_WIDTHS = [160, 320, 640];
export const CARD_IMAGE_DEFAULT_WIDTH = 320;
const CARD_IMAGE_MODAL_WIDTH = 640;

/** 與 grid 欄寬一致，避免 sizes 高估導致 browser 選到過大 src */
export const CARD_GALLERY_SIZES =
  '(max-width: 640px) 42vw, (max-width: 1024px) 180px, 200px';
export const CARD_MODAL_SIZES = '(max-width: 768px) min(90vw, 384px), 384px';

/**
 * 取得卡片所有異畫的「取得方式」清單（依序）。
 * - 單一異畫：沿用舊欄位 hasAlternateArt + alternateSource。
 * - 多個異畫：使用 alternates 陣列（字串），每個元素為一個異畫的取得方式。
 */
function getCardAltSources(card) {
  if (!card) return [];
  if (Array.isArray(card.alternates)) {
    return card.alternates.filter(
      (s) => typeof s === 'string' && s.trim() !== '',
    );
  }
  if (
    card.hasAlternateArt &&
    typeof card.alternateSource === 'string' &&
    card.alternateSource.trim() !== ''
  ) {
    return [card.alternateSource.trim()];
  }
  return [];
}

/** 有異畫的卡必須至少具備一個異畫取得方式 */
export function cardHasAlternateArt(card) {
  return getCardAltSources(card).length > 0;
}

/** 依序回傳可切換的圖片版本：['main', 'alt', 'alt2', ...]（'alt' 即第一個異畫） */
export function getCardArtVariants(card) {
  return [
    'main',
    ...getCardAltSources(card).map((_, i) => (i === 0 ? 'alt' : `alt${i + 1}`)),
  ];
}

/** 變體名稱的唯一解析點：'alt' → 0、'alt2' → 1…；'main' 或未知值 → -1 */
function variantAltIndex(variant) {
  if (variant === 'alt') return 0;
  const match = /^alt(\d+)$/.exec(variant ?? '');
  return match ? Number(match[1]) - 1 : -1;
}

/** 某個版本對應的「取得方式」；main 回主圖 source，異畫回對應的 alternates */
export function getVariantSource(card, variant) {
  const idx = variantAltIndex(variant);
  if (idx < 0) return card?.source;
  return getCardAltSources(card)[idx] ?? card?.source;
}

/** 版本的顯示標籤：'alt' → 「異畫」、'alt2' → 「異畫2」… */
export function variantBadgeLabel(variant) {
  const idx = variantAltIndex(variant);
  if (idx < 0) return '';
  return idx === 0 ? '異畫' : `異畫${idx + 1}`;
}

function cardBaseName(cardId, variant) {
  return variant === 'main' ? cardId : `${cardId}${variant}`;
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

/** gallery 每張卡每次 render 都會讀取，快取解析結果避免重複 JSON.parse（raw 變動時自動失效） */
let cachedRaw = null;
let cachedMap = {};

function readVariantMap() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedMap = raw ? JSON.parse(raw) : {};
    } catch {
      cachedMap = {};
    }
  }
  return cachedMap;
}

export function getStoredArtVariant(cardId, validVariants) {
  try {
    const v = readVariantMap()[cardId];
    if (!v || v === 'main') return 'main';
    if (Array.isArray(validVariants) && !validVariants.includes(v)) return 'main';
    return v;
  } catch {
    return 'main';
  }
}

export function setStoredArtVariant(cardId, variant) {
  try {
    const map = { ...readVariantMap() };
    if (variant === 'main') delete map[cardId];
    else map[cardId] = variant;
    const raw = JSON.stringify(map);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedMap = map;
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new CustomEvent(CARD_ART_CHANGED_EVENT, { detail: { cardId } }));
}

/** 與 CardGallery 列高同步（桌面估算下限） */
export const CARD_ROW_HEIGHT = 320;

/**
 * 卡圖下方資訊區下限（名稱 + meta + 符號 + stats）。
 * 手機 compact：Playwright 全池實測 info 區最高 119px（如黑色葬禮）；120 含 1px 緩衝。
 */
export const CARD_BODY_HEIGHT_MOBILE = 119;
const CARD_BODY_HEIGHT_DESKTOP = 200;
const CARD_ACTION_BAR_HEIGHT_DESKTOP = 40;
const CARD_ACTION_BAR_HEIGHT_MOBILE = 36;
const CARD_IMAGE_ASPECT = 4 / 3;

/** 查牌預設每頁張數（與 usePagination 預設一致） */
export const GALLERY_DEFAULT_PAGE_SIZE = 24;

/** 首屏 LCP 卡圖（catalog 第一分片 cro 的第一張） */
export const LCP_CARD_ID = 'cro01';

/** 與 index.html preload、CARD_IMAGE_DEFAULT_WIDTH 一致 */
export const LCP_IMAGE_WIDTH = 320;

/**
 * 依卡池實際欄寬估算虛擬列表列高，讓 3:4 卡圖以 contain 完整顯示。
 * @param {number} [containerWidth]
 * @param {number} [columnCount]
 */
export function getCardRowHeight(containerWidth, columnCount = 2) {
  const width =
    typeof containerWidth === 'number' && containerWidth > 0
      ? containerWidth
      : typeof window !== 'undefined'
        ? window.innerWidth
        : 1024;

  const cols = typeof columnCount === 'number' && columnCount > 0 ? columnCount : 2;
  const gap = width < 640 ? 4 : 16;
  // 與 CardGallery / react-window 一致：columnWidth = width / cols，cell 左右 padding 合計 gap
  const columnWidth = width / cols;
  const horizontalPad = width < 640 ? 0 : gap;
  const contentWidth = Math.max(columnWidth - horizontalPad, 80);
  const imageHeight = contentWidth * CARD_IMAGE_ASPECT;
  const bodyHeight = width < 640 ? CARD_BODY_HEIGHT_MOBILE : CARD_BODY_HEIGHT_DESKTOP;
  const actionHeight =
    width < 640 ? CARD_ACTION_BAR_HEIGHT_MOBILE : CARD_ACTION_BAR_HEIGHT_DESKTOP;

  return Math.ceil(imageHeight + bodyHeight + actionHeight + gap);
}

/**
 * 預估卡池佔位高度，避免內容撐開後把 footer 往下推（CLS）。
 * @param {number} cardCount
 * @param {number} columnCount
 * @param {number} [rowHeight]
 */
export function estimateGalleryMinHeight(cardCount, columnCount, rowHeight = CARD_ROW_HEIGHT) {
  if (!cardCount || !columnCount) return 0;
  const rows = Math.ceil(cardCount / columnCount);
  return rows * rowHeight;
}

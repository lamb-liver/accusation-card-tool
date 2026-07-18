/** 查卡 grid 預留高度的單列估算值 */
export const CARD_ROW_HEIGHT = 320;

/** 查卡預設每頁張數（與 usePagination 預設一致） */
export const GALLERY_DEFAULT_PAGE_SIZE = 24;

/** 首屏 LCP 卡圖（catalog 第一分片 cro 的第一張） */
export const LCP_CARD_ID = 'cro01';

/** 與 index.html preload、CARD_IMAGE_DEFAULT_WIDTH 一致 */
export const LCP_IMAGE_WIDTH = 320;

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

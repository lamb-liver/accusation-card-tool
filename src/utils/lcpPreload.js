import { getCardImageAvifSrc } from './cardAlternateArt.js';
import { LCP_CARD_ID, LCP_IMAGE_WIDTH } from './galleryLayout.js';
import { preloadImage } from './imageHints.js';

/** 與 index.html 的 link preload 同一 URL，供 main.jsx 在 React 前再保險一次 */
export function getLcpCardImageHref() {
  return `/${getCardImageAvifSrc(LCP_CARD_ID, 'main', LCP_IMAGE_WIDTH)}`;
}

export function preloadLcpCardImage() {
  preloadImage(getLcpCardImageHref());
}

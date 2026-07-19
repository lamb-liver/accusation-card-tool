/**
 * 回到頁首。換頁／改每頁張數／變更篩選後呼叫，避免使用者停留在
 * 新結果集的底部或空白區。
 * @param {ScrollBehavior} [behavior] 'auto'（預設，立即）或 'smooth'
 */
export function scrollToTop(behavior = 'auto') {
  window.scrollTo({ top: 0, left: 0, behavior });
}

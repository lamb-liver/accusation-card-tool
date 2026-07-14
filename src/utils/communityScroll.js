const SCROLL_KEY = 'community-scroll-y';
const RETURN_PATH_KEY = 'community-return-path';

/** 進入牌組詳情前儲存列表捲動位置與 hash（silent alias 用）。 */
export function saveCommunityListState() {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    sessionStorage.setItem(RETURN_PATH_KEY, raw || 'community');
  } catch {
    // 隱私模式/配額不足時放棄記憶捲動位置；不可因此阻斷導覽
  }
}

/** @returns {string} */
export function consumeCommunityReturnPath() {
  const path = sessionStorage.getItem(RETURN_PATH_KEY);
  sessionStorage.removeItem(RETURN_PATH_KEY);
  return path || 'community';
}

/** 離開交流區（含從詳情改去其他分頁）時清除，避免下次進入誤還原捲動。 */
export function clearCommunityListState() {
  sessionStorage.removeItem(SCROLL_KEY);
  sessionStorage.removeItem(RETURN_PATH_KEY);
}

/**
 * 從詳情返回列表後還原捲動（僅在 saveCommunityListState 後、clear 前有效）。
 * 執行後會清除 scrollY。
 */
export function restoreCommunityScroll() {
  const raw = sessionStorage.getItem(SCROLL_KEY);
  if (raw == null) return;
  sessionStorage.removeItem(SCROLL_KEY);
  const top = Number(raw);
  if (!Number.isFinite(top)) return;
  requestAnimationFrame(() => {
    window.scrollTo({ top, left: 0, behavior: 'instant' });
  });
}

/**
 * @param {'guestbook' | 'decks'} section
 */
export function scrollToCommunitySection(section) {
  const id = section === 'decks' ? 'community-decks' : 'community-guestbook';
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

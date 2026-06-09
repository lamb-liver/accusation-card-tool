import { useEffect } from 'react';

export const DEFAULT_PAGE_TITLE = '控訴 - 查卡、組牌與常見問題';

/**
 * @param {string | null | undefined} title 為 null 時不變更
 */
export function usePageTitle(title) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

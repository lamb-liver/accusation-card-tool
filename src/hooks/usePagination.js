import { useState, useMemo, useEffect } from 'react';

/**
 * 管理分頁邏輯。perPage = 0 代表顯示全部。
 * @param {object[]} filteredCards - 已篩選的卡牌列表
 * @returns {{
 *   currentPage: number,
 *   setCurrentPage: Function,
 *   perPage: number,
 *   isPaginationMode: boolean,
 *   totalPages: number,
 *   safePage: number,
 *   paginatedCards: object[],
 *   handlePerPageChange: Function,
 * }}
 */
export function usePagination(filteredCards) {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(24);

  const isPaginationMode = perPage > 0;

  /**
   * 以陣列 identity 而非 length 判斷「結果集換了」：兩組不同篩選的結果
   * 張數可能相同（例如兩個教團各 24 張），比 length 會漏掉那次重置、
   * 讓使用者停在舊頁碼。上游 filteredCards 是 useMemo 產物，只在
   * 資料或篩選條件改變時換 identity，不會每次 render 都觸發。
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredCards]);

  const totalPages = useMemo(() => {
    if (!isPaginationMode || filteredCards.length === 0) return 1;
    return Math.max(1, Math.ceil(filteredCards.length / perPage));
  }, [filteredCards.length, isPaginationMode, perPage]);

  const safePage = useMemo(
    () => Math.min(Math.max(1, currentPage), totalPages),
    [currentPage, totalPages],
  );

  const paginatedCards = useMemo(() => {
    if (!isPaginationMode) return filteredCards;
    const start = (safePage - 1) * perPage;
    return filteredCards.slice(start, start + perPage);
  }, [filteredCards, isPaginationMode, perPage, safePage]);

  const handlePerPageChange = (val) => {
    setPerPage(val);
    setCurrentPage(1);
  };

  return {
    currentPage,
    setCurrentPage,
    perPage,
    isPaginationMode,
    totalPages,
    safePage,
    paginatedCards,
    handlePerPageChange,
  };
}

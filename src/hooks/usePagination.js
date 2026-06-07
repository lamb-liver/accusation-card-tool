import { useState, useMemo, useEffect, useRef } from 'react';

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
  const prevLengthRef = useRef(filteredCards.length);

  const isPaginationMode = perPage > 0;

  useEffect(() => {
    if (filteredCards.length !== prevLengthRef.current) {
      prevLengthRef.current = filteredCards.length;
      setCurrentPage(1);
    }
  }, [filteredCards.length]);

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

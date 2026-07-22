import {
  useState,
  useMemo,
  useCallback,
  useTransition,
  useDeferredValue,
} from 'react';
import { filterCardIndices } from '../utils/cardFilterLogic.js';

const INITIAL_FILTERS = {
  faction: '',
  type: '',
  symbol: '',
  mechanic: '',
};

/** 篩選維度的唯一清單；URL 讀寫與 activeFilterCount 都由它推導 */
export const FILTER_KEYS = Object.keys(INITIAL_FILTERS);

/**
 * 只取白名單內的鍵並轉成字串，其餘忽略。
 * URL 是使用者可任意編輯的輸入，不可直接展開進 state。
 * @param {Record<string, unknown> | undefined} source
 */
export function pickFilters(source) {
  const picked = { ...INITIAL_FILTERS };
  if (!source || typeof source !== 'object') return picked;
  for (const key of FILTER_KEYS) {
    if (typeof source[key] === 'string') picked[key] = source[key];
  }
  return picked;
}

/**
 * 管理搜尋詞、下拉篩選與過濾結果。
 * startTransition + useDeferredValue 足夠支撐目前卡量。
 *
 * @param {object[]} allCards
 * @param {{ searchTerm?: string, filters?: Record<string, string> }} [initial]
 *   僅用於首次 mount（例如從網址還原）；後續變更由呼叫端同步回網址。
 */
export function useCardFilters(allCards, initial = {}) {
  const [searchTerm, setSearchTermState] = useState(() =>
    typeof initial.searchTerm === 'string' ? initial.searchTerm : '',
  );
  const [filters, setFiltersState] = useState(() => pickFilters(initial.filters));
  const [isPending, startTransition] = useTransition();

  const setSearchTerm = useCallback((value) => {
    startTransition(() => setSearchTermState(value));
  }, []);

  const setFilters = useCallback((value) => {
    startTransition(() => {
      setFiltersState(typeof value === 'function' ? value : value);
    });
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    startTransition(() => {
      setFiltersState((prev) => ({ ...prev, [key]: value === 'all' ? '' : value }));
    });
  }, []);

  const filteredCards = useMemo(() => {
    return filterCardIndices(allCards, searchTerm, filters).map((i) => allCards[i]);
  }, [allCards, searchTerm, filters]);

  const deferredFilteredCards = useDeferredValue(filteredCards);
  const isFilterStale = filteredCards !== deferredFilteredCards;

  /** 啟用中的條件數（含搜尋）；鍵源自 FILTER_KEYS，新增篩選維度不必改 App */
  const activeFilterCount =
    (searchTerm.trim() ? 1 : 0) + FILTER_KEYS.filter((key) => filters[key]).length;

  const resetFilters = useCallback(() => {
    startTransition(() => {
      setSearchTermState('');
      setFiltersState(INITIAL_FILTERS);
    });
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    handleFilterChange,
    filteredCards,
    deferredFilteredCards,
    isFilterPending: isPending || isFilterStale,
    activeFilterCount,
    resetFilters,
  };
}

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

/**
 * 管理搜尋詞、下拉篩選與過濾結果。
 * startTransition + useDeferredValue 足夠支撐目前卡量。
 */
export function useCardFilters(allCards) {
  const [searchTerm, setSearchTermState] = useState('');
  const [filters, setFiltersState] = useState(INITIAL_FILTERS);
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

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    handleFilterChange,
    filteredCards,
    deferredFilteredCards,
    isFilterPending: isPending || isFilterStale,
  };
}

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
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

/** 超過此數量才將 filter 移至 Worker */
const WORKER_THRESHOLD = 80;

function toSlimCards(allCards) {
  return allCards.map((c) => ({
    name: c.name,
    effect: c.effect,
    faction: c.faction,
    type: c.type,
    symbols: c.symbols,
  }));
}

/**
 * 管理搜尋詞、下拉篩選與過濾結果。
 * startTransition + useDeferredValue + 可選 Web Worker。
 */
export function useCardFilters(allCards) {
  const [searchTerm, setSearchTermState] = useState('');
  const [filters, setFiltersState] = useState(INITIAL_FILTERS);
  const [workerIndices, setWorkerIndices] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [workerFailed, setWorkerFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const workerRef = useRef(null);
  const requestIdRef = useRef(0);
  const useWorker = allCards.length >= WORKER_THRESHOLD;
  const useWorkerFilter = useWorker && !workerFailed;

  const runFilterOnWorker = useCallback(() => {
    const worker = workerRef.current;
    if (!worker || !workerReady) return;
    const requestId = ++requestIdRef.current;
    worker.postMessage({
      type: 'filter',
      requestId,
      payload: { searchTerm, filters },
    });
  }, [searchTerm, filters, workerReady]);

  useEffect(() => {
    if (!useWorker || typeof Worker === 'undefined') {
      setWorkerIndices(null);
      setWorkerReady(false);
      setWorkerFailed(false);
      return undefined;
    }

    setWorkerFailed(false);

    const worker = new Worker(
      new URL('../workers/cardFilter.worker.js', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;
    setWorkerReady(false);
    setWorkerIndices(null);

    worker.onmessage = (event) => {
      const { type, requestId, indices } = event.data;
      if (type === 'ready') {
        setWorkerReady(true);
        return;
      }
      if (type === 'result' && requestId === requestIdRef.current) {
        setWorkerIndices(indices);
      }
    };

    worker.onerror = (event) => {
      console.warn('cardFilter worker failed, falling back to main thread:', event.message);
      setWorkerFailed(true);
      setWorkerReady(false);
      setWorkerIndices(null);
    };

    worker.postMessage({
      type: 'init',
      requestId: 0,
      payload: { cards: toSlimCards(allCards) },
    });

    return () => {
      worker.terminate();
      workerRef.current = null;
      setWorkerReady(false);
      setWorkerFailed(false);
    };
  }, [allCards, useWorker]);

  useEffect(() => {
    if (useWorkerFilter && workerReady) runFilterOnWorker();
  }, [useWorkerFilter, workerReady, runFilterOnWorker]);

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

  const skipSyncFilter = useWorkerFilter && workerReady;

  const syncIndices = useMemo(() => {
    if (skipSyncFilter) return null;
    return filterCardIndices(allCards, searchTerm, filters);
  }, [allCards, searchTerm, filters, skipSyncFilter]);

  const filteredCards = useMemo(() => {
    if (useWorkerFilter && workerReady && workerIndices) {
      return workerIndices.map((i) => allCards[i]);
    }
    if (skipSyncFilter) {
      return filterCardIndices(allCards, searchTerm, filters).map((i) => allCards[i]);
    }
    return (syncIndices ?? []).map((i) => allCards[i]);
  }, [allCards, searchTerm, filters, useWorkerFilter, workerReady, workerIndices, skipSyncFilter, syncIndices]);

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

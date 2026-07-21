import { useState, useEffect, useCallback, useRef } from 'react';
import { loadCardCatalog } from '../utils/cardCatalog.js';

/**
 * React hook：訂閱卡牌目錄載入狀態。
 * 載入策略見 {@link loadCardCatalog}。
 */
export function useCardData() {
  const [allCards, setAllCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  /** 連按重試時，較早發出的請求不得覆蓋較新請求的結果 */
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isStale = () => requestId !== requestIdRef.current;

    setIsError(false);
    let showedCache = false;

    try {
      await loadCardCatalog({
        onUpdate: (cards) => {
          if (isStale()) return;
          setAllCards(cards);
          setIsLoading(false);
          showedCache = true;
        },
        onCacheMiss: () => {
          if (!showedCache && !isStale()) setIsLoading(true);
        },
      });
    } catch (err) {
      console.error('讀取卡片失敗:', err);
      if (!showedCache && !isStale()) {
        setIsError(true);
        setAllCards([]);
      }
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { allCards, isLoading, isError, retry: load };
}

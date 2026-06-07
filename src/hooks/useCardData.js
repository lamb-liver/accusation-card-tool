import { useState, useEffect, useCallback } from 'react';
import { loadCardCatalog } from '../utils/cardCatalog.js';

/**
 * React hook：訂閱卡牌目錄載入狀態。
 * 載入策略見 {@link loadCardCatalog}。
 */
export function useCardData() {
  const [allCards, setAllCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    setIsError(false);
    let showedCache = false;

    try {
      await loadCardCatalog({
        onUpdate: (cards) => {
          setAllCards(cards);
          setIsLoading(false);
          showedCache = true;
        },
        onCacheMiss: () => {
          if (!showedCache) setIsLoading(true);
        },
      });
    } catch (err) {
      console.error('讀取卡片失敗:', err);
      if (!showedCache) {
        setIsError(true);
        setAllCards([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { allCards, isLoading, isError, retry: load };
}

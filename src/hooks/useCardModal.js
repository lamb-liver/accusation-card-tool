import { useCallback, useState } from 'react';

/**
 * 管理 CardModal 的選中卡牌、所屬列表與左右導航。
 *
 * 卡片與所屬列表合併為單一 state：導航只需比對「同一次開啟」的兩者，
 * 合併後 updater 能從 prev 取得全部所需資料，四個回傳函式才能都是空依賴的
 * useCallback。這對呼叫端是必要的——App 的 handleGalleryCardClick 與
 * DeckPoolSection 的 handlePoolCardClick 都靠它們穩定，才能讓
 * CardGallery / Card 的 memo 真正生效；CardModal 鎖背景捲動的 effect 也
 * 依賴 onClose，不穩定會導致 keydown listener 反覆解除重掛。
 *
 * @returns {{
 *   selectedCard: object|null,
 *   selectedCardList: object[],
 *   handleCardClick: (card: object, list?: object[]) => void,
 *   handleModalPrev: () => void,
 *   handleModalNext: () => void,
 *   closeModal: () => void,
 * }}
 */
export function useCardModal() {
  const [state, setState] = useState({ card: null, list: [] });

  const handleCardClick = useCallback((card, list = []) => {
    setState({ card, list });
  }, []);

  /** @param {-1 | 1} delta */
  const step = useCallback((delta) => {
    setState((prev) => {
      if (!prev.card) return prev;
      const idx = prev.list.findIndex((c) => c.id === prev.card.id);
      // 卡片不在列表中（idx === -1）時不導航：舊版的 next 會在此情況跳到第一張
      if (idx < 0) return prev;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= prev.list.length) return prev;
      return { ...prev, card: prev.list[nextIdx] };
    });
  }, []);

  const handleModalPrev = useCallback(() => step(-1), [step]);
  const handleModalNext = useCallback(() => step(1), [step]);

  /** 僅清除選中卡牌；列表保留（關閉後不再讀取，重開時由 handleCardClick 覆寫） */
  const closeModal = useCallback(() => {
    setState((prev) => (prev.card === null ? prev : { ...prev, card: null }));
  }, []);

  return {
    selectedCard: state.card,
    selectedCardList: state.list,
    handleCardClick,
    handleModalPrev,
    handleModalNext,
    closeModal,
  };
}

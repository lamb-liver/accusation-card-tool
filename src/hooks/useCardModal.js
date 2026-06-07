import { useState } from 'react';

/**
 * 管理 CardModal 的選中卡牌、所屬列表與左右導航。
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
  const [selectedCard, setSelectedCard]         = useState(null);
  const [selectedCardList, setSelectedCardList] = useState([]);

  const handleCardClick = (card, list = []) => {
    setSelectedCard(card);
    setSelectedCardList(list);
  };

  const handleModalPrev = () => {
    const idx = selectedCardList.findIndex(c => c.id === selectedCard?.id);
    if (idx > 0) setSelectedCard(selectedCardList[idx - 1]);
  };

  const handleModalNext = () => {
    const idx = selectedCardList.findIndex(c => c.id === selectedCard?.id);
    if (idx < selectedCardList.length - 1) setSelectedCard(selectedCardList[idx + 1]);
  };

  const closeModal = () => setSelectedCard(null);

  return { selectedCard, selectedCardList, handleCardClick, handleModalPrev, handleModalNext, closeModal };
}

import { useState, useRef } from 'react';
import { X } from 'lucide-react';

export default function DeckCardRow({ card, onRemove, sortMain = false }) {
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);

  const onTouchStart = (event) => {
    startXRef.current = event.touches[0].clientX;
    setSwiping(false);
  };

  const onTouchEnd = (event) => {
    const diff = event.changedTouches[0].clientX - startXRef.current;
    if (diff < -50) {
      setSwiping(true);
      setTimeout(() => {
        onRemove(card.id);
        setSwiping(false);
      }, 300);
      return;
    }
    setSwiping(false);
  };

  return (
    <li
      className={`slot-list-item relative overflow-hidden flex items-center justify-between bg-[#3a3a3a] hover:bg-[#4a4a4a] p-2 rounded text-sm transition border-l-2 border-brand-gold ${
        swiping ? 'swiping' : ''
      }`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      {...(sortMain ? { 'data-sort-main': 'true', 'data-card-id': card.id } : {})}
    >
      <div
        className={`swipe-bg absolute right-0 top-0 bottom-0 z-0 flex w-20 items-center justify-center bg-[#8b0000] text-white transition-transform duration-200 ${
          swiping ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        刪除
      </div>
      <div className="relative z-[1] flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="deck-card-name text-[#e0e0e0] font-medium truncate">{card.name}</p>
          <p className="text-xs text-[#888]">
            {card.faction} / {card.type}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(card.id)}
          className="ml-2 inline-flex shrink-0 items-center justify-center bg-[#8b0000] hover:bg-[#a50000] text-white font-bold py-1 px-2 rounded text-xs transition"
          aria-label={`移除 ${card.name}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} />
        </button>
      </div>
    </li>
  );
}

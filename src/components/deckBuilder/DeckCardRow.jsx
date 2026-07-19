import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';

export default function DeckCardRow({ card, onRemove, onCardClick, sortMain = false }) {
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const movedRef = useRef(false);
  const removeTimerRef = useRef(null);

  // 滑動刪除的 300ms 動畫計時器；卸載時取消，避免對已移除的卡再次觸發 onRemove
  useEffect(() => () => clearTimeout(removeTimerRef.current), []);

  const onTouchStart = (event) => {
    startXRef.current = event.touches[0].clientX;
    movedRef.current = false;
    setSwiping(false);
  };

  // 門檻需高於一般點按抖動（tap slop 約 10px），又遠低於滑動刪除的 50px，
  // 否則手指微幅飄移的點按會被當成滑動而無聲吞掉「開啟詳情」
  const onTouchMove = (event) => {
    if (Math.abs(event.touches[0].clientX - startXRef.current) > 24) {
      movedRef.current = true;
    }
  };

  const onTouchEnd = (event) => {
    const diff = event.changedTouches[0].clientX - startXRef.current;
    if (diff < -50) {
      setSwiping(true);
      clearTimeout(removeTimerRef.current);
      removeTimerRef.current = setTimeout(() => {
        onRemove(card.id);
        setSwiping(false);
      }, 300);
      return;
    }
    setSwiping(false);
  };

  // 滑動或拖曳（主牌組排序）後不應觸發開啟詳情
  const handleOpen = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    onCardClick?.(card);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onCardClick?.(card);
    }
  };

  return (
    <li
      className={`slot-list-item relative overflow-hidden flex items-center justify-between bg-[#3a3a3a] hover:bg-[#4a4a4a] p-2 rounded text-sm transition border-l-2 border-brand-gold ${
        swiping ? 'swiping' : ''
      }`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
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
        {/* 用 div 而非 button：主牌組以 sortablejs 拖曳排序，其 filter:'button' 會排除 button 不可拖 */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-brand-gold rounded"
          aria-label={`查看 ${card.name} 詳情`}
        >
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

import { ArrowDownWideNarrow, Trash2 } from 'lucide-react';
import DeckCardRow from './DeckCardRow.jsx';

export default function DeckSlotsSection({
  deck,
  onRemoveCard,
  onClearCategory,
  onSortMain,
  onCardClick,
  mainListRef,
}) {
  return (
    <div className="deck-slots border-t border-[#444] pt-3">
      <div className="deck-group mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-yellow-400 font-semibold">教主 ({deck.leader.length}/1)</h3>
          <button
            type="button"
            onClick={() => onClearCategory('leader')}
            className="clear-category inline-flex h-8 w-8 items-center justify-center text-[#aaa] hover:text-[#8b0000] transition"
            aria-label="清空教主"
          >
            <Trash2 className="h-4 w-4" aria-hidden strokeWidth={2.25} />
          </button>
        </div>
        <ul className="slot-list space-y-1 bg-[#2a2a2a] rounded p-2 min-h-12 border border-[#444]">
          {deck.leader.length === 0 ? (
            <li className="text-[#888] text-xs italic py-2">無卡片</li>
          ) : (
            deck.leader.map((card) => (
              <DeckCardRow key={card.id} card={card} onRemove={onRemoveCard} onCardClick={onCardClick} />
            ))
          )}
        </ul>
      </div>

      <div className="deck-group mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-purple-400 font-semibold">儀式 ({deck.rituals.length}/3)</h3>
          <button
            type="button"
            onClick={() => onClearCategory('rituals')}
            className="clear-category inline-flex h-8 w-8 items-center justify-center text-[#aaa] hover:text-[#8b0000] transition"
            aria-label="清空儀式"
          >
            <Trash2 className="h-4 w-4" aria-hidden strokeWidth={2.25} />
          </button>
        </div>
        <ul className="slot-list space-y-1 bg-[#2a2a2a] rounded p-2 min-h-12 border border-[#444]">
          {deck.rituals.length === 0 ? (
            <li className="text-[#888] text-xs italic py-2">無卡片</li>
          ) : (
            deck.rituals.map((card) => (
              <DeckCardRow key={card.id} card={card} onRemove={onRemoveCard} onCardClick={onCardClick} />
            ))
          )}
        </ul>
      </div>

      <div className="deck-group mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <h3 className="text-cyan-400 font-semibold">主牌組 ({deck.main.length}/20)</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onSortMain}
              disabled={deck.main.length < 2}
              className="inline-flex h-8 w-8 items-center justify-center text-[#aaa] transition hover:text-brand-gold disabled:pointer-events-none disabled:opacity-35"
              aria-label="排序主牌組（種類→教團→編號）"
              title="排序：信徒→地點→魔法，主教團→副教團，再依編號"
            >
              <ArrowDownWideNarrow className="h-4 w-4" aria-hidden strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => onClearCategory('main')}
              className="clear-category inline-flex h-8 w-8 items-center justify-center text-[#aaa] hover:text-[#8b0000] transition"
              aria-label="清空主牌組"
            >
              <Trash2 className="h-4 w-4" aria-hidden strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div className="h-1 w-full rounded-full bg-neutral-700 overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              deck.main.length > 20
                ? 'bg-danger-red'
                : deck.main.length === 20
                  ? 'bg-brand-gold'
                  : 'bg-brand-gold/70'
            }`}
            style={{ width: `${Math.min((deck.main.length / 20) * 100, 100)}%` }}
          />
        </div>

        <div id="slotMain">
          <ul
            ref={mainListRef}
            className="slot-list space-y-1 bg-[#2a2a2a] rounded p-2 min-h-20 border border-[#444]"
          >
            {deck.main.length === 0 ? (
              <li className="text-[#888] text-xs italic py-2">無卡片</li>
            ) : (
              deck.main.map((card) => (
                <DeckCardRow key={card.id} card={card} onRemove={onRemoveCard} onCardClick={onCardClick} sortMain />
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

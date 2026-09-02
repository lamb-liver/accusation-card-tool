const TYPE_CHIP = {
  地點: 'border-cyan-400 bg-cyan-950/45 text-cyan-100',
  信徒: 'border-emerald-400 bg-emerald-950/45 text-emerald-100',
  魔法: 'border-indigo-400 bg-indigo-950/45 text-indigo-100',
};

/**
 * 主牌組地點／信徒／魔法張數。理由：組牌時只看總張數要自己在列表裡數，
 * 三種永遠顯示（含 0）才能看出目前偏哪一種。
 *
 * @param {{ entries: { type: string, count: number }[], compact?: boolean }} props
 */
export default function DeckTypeStats({ entries, compact = false }) {
  if (!entries?.length) return null;

  if (compact) {
    return (
      <p className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold tabular-nums text-gray-300">
        {entries.map(({ type, count }) => (
          <span key={type}>
            {type}
            <span className="ml-0.5 text-brand-gold">{count}</span>
          </span>
        ))}
      </p>
    );
  }

  return (
    <div className="deck-type-stats">
      <ul className="grid grid-cols-3 gap-1.5">
        {entries.map(({ type, count }) => (
          <li
            key={type}
            className={`flex items-center justify-between gap-1 rounded border px-1.5 py-1 ${
              TYPE_CHIP[type] || 'border-neutral-500 bg-neutral-900/85 text-neutral-200'
            }`}
          >
            <span className="truncate text-[11px]">{type}</span>
            <span className="shrink-0 text-xs font-bold tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { SYMBOL_ICONS } from '../../constants/symbols.js';

/**
 * 牌組符號分佈。
 *
 * 效果的 `(N*符號)` 判定看的是**場上**擁有的符號總數（非張數，單張卡可提供多個
 * 同符號）。主牌組要抽到並打出才會上場，所以這裡顯示的是牌組內的**上限**而非
 * 判定值——說明文字必須講清楚，否則玩家會把它當成場上擁有數。
 *
 * 計入哪些卡型的規則見 {@link collectDeckSymbolCounts}。
 *
 * @param {{ entries: { symbol: string, count: number }[] }} props
 */
export default function DeckSymbolStats({ entries }) {
  if (entries.length === 0) return null;

  return (
    <div className="deck-symbol-stats border-t border-[#444] pt-3">
      <p className="mb-2 text-sm font-semibold text-brand-gold">牌組符號總數</p>
      <ul className="grid grid-cols-3 gap-1.5">
        {entries.map(({ symbol, count }) => (
          <li
            key={symbol}
            className="flex items-center justify-between gap-1 rounded border border-amber-500/40 bg-amber-950/25 px-1.5 py-1"
          >
            <span className="flex min-w-0 items-center gap-1">
              {SYMBOL_ICONS[symbol] && (
                <img
                  src={SYMBOL_ICONS[symbol]}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-3 w-3 shrink-0 object-contain"
                />
              )}
              <span className="truncate text-[11px] text-amber-100">{symbol}</span>
            </span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-brand-gold">
              {count}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[10px] leading-snug text-gray-400">
        含教主與儀式，單張卡可提供多個同符號。效果的「擁有」以場上為準，
        此處為牌組內的符號上限。
      </p>
    </div>
  );
}

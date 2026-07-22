import { SYMBOL_ICONS } from '../../constants/symbols.js';

/**
 * 牌組符號分佈。
 *
 * 儀式與部分效果以 `(N*符號)` 判定，算的是符號總數而非張數，故此處顯示總數
 * （單張卡可提供多個同符號）。標題明講「牌組」：這是構築時的總量，不是對局中
 * 場上的實際擁有數，兩者不可混為一談。
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
        含教主與儀式；單張卡可提供多個同符號。此為牌組總量，非場上擁有數。
      </p>
    </div>
  );
}

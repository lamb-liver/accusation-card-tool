import { BarChart3, FilterX, Hammer, HelpCircle, MessageSquare, Search, Timer, X } from 'lucide-react';
import { FILTER_OPTIONS } from '../constants/filterOptions.js';

const toolbarSelectClass =
  'native-select w-full rounded-md border bg-[#2a2a2a] py-3 pl-3 pr-3 text-base leading-snug outline-none transition focus:outline focus:outline-2 focus:outline-brand-gold';

export default function FilterToolbar({
  currentMode = 'gallery',
  onModeChange = () => {},
  searchTerm = '',
  onSearchChange = () => {},
  filters = {
    faction: 'all',
    type: 'all',
    symbol: 'all',
    mechanic: 'all',
  },
  onFilterChange = () => {},
  resultCount = 0,
  activeFilterCount = 0,
  onClearFilters = () => {},
}) {
  const showCardFilters = currentMode === 'gallery' || currentMode === 'deck';

  const modes = [
    { id: 'gallery', label: '查卡', Icon: Search },
    { id: 'deck', label: '組牌', Icon: Hammer },
    { id: 'community', label: '交流', Icon: MessageSquare },
    { id: 'qa', label: 'QA', Icon: HelpCircle },
    { id: 'clock', label: '計時', Icon: Timer },
  ];

  const dropdowns = [
    { key: 'faction', fallbackLabel: '所有教團' },
    { key: 'type', fallbackLabel: '所有種類' },
    { key: 'symbol', fallbackLabel: '所有符號' },
    { key: 'mechanic', fallbackLabel: '所有效果關鍵字' },
  ];

  return (
    <>
      <header className="w-full px-4 pt-3 text-center">
        <h1 className="app-brand-title m-0 break-words text-lg font-bold text-brand-gold sm:text-xl md:text-2xl">
          控訴-查卡＆組牌＆QA
        </h1>
      </header>

      <div className="sticky-toolbar sticky top-0 z-[1100] flex w-full flex-col items-center border-b-2 border-brand-gold bg-neutral-900/95 px-4 py-3 shadow-[0_4px_15px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="flex w-full max-w-[640px] flex-col items-center gap-3">
          <div className="mode-switch flex w-full flex-wrap justify-center gap-2">
            {modes.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onModeChange(id)}
                aria-pressed={currentMode === id}
                className={`mode-btn flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border px-1 py-2 text-xs font-bold transition sm:min-w-[5rem] sm:gap-1.5 sm:px-2 sm:text-sm ${
                  currentMode === id
                    ? 'border-brand-gold bg-brand-gold text-neutral-900 shadow-[0_0_8px_rgba(255,215,0,0.3)]'
                    : 'border-[#444] bg-[#2a2a2a] text-[#e0e0e0] hover:border-brand-gold hover:bg-[#333]'
                }`}
              >
                <Icon
                  aria-hidden
                  className="pointer-events-none h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                  strokeWidth={currentMode === id ? 2.5 : 2}
                />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {showCardFilters && (
            <div className="search-wrapper relative w-full max-w-[500px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="搜尋卡名或效果..."
                aria-label="搜尋卡片"
                className="toolbar-search-input w-full rounded-md border-none bg-[#222] py-3 pl-3 pr-10 text-base text-white placeholder-gray-400 outline-none ring-0"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="清除搜尋"
                  className="clear-search-btn absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center border-none bg-transparent p-0 text-[#aaa] hover:text-white"
                >
                  <X aria-hidden className="h-4 w-4" strokeWidth={2.25} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showCardFilters && (
        <div
          id="galleryControls"
          className="controls mx-auto mb-6 mt-2 hidden w-full max-w-[1000px] grid-cols-2 gap-2.5 px-4 pb-2 md:grid xl:grid-cols-4"
        >
          {dropdowns.map(({ key, fallbackLabel }) => {
            const isActive = Boolean(filters[key] && filters[key] !== 'all');
            return (
              <select
                key={key}
                id={`desktop-${key}`}
                value={filters[key] || 'all'}
                onChange={(event) => onFilterChange(key, event.target.value)}
                aria-label={fallbackLabel}
                className={`${toolbarSelectClass} ${
                  isActive ? 'border-brand-gold text-brand-gold' : 'border-[#444] text-white'
                }`}
              >
                {FILTER_OPTIONS[key].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            );
          })}

          <div className="filter-stats col-span-full mt-2 flex items-center justify-center gap-3 text-center text-[13px] font-medium text-brand-gold">
            <span className="flex items-center gap-1">
              <BarChart3 aria-hidden className="h-[13px] w-[13px] shrink-0" strokeWidth={2.25} />
              <span>
                共 <span className="font-bold">{resultCount}</span> 張卡牌
              </span>
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onClearFilters}
                className="flex items-center gap-1 rounded border border-[#555] px-2 py-1 text-xs text-gray-300 transition hover:border-brand-gold hover:text-brand-gold"
              >
                <FilterX aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                清除篩選（{activeFilterCount}）
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

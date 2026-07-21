import { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { qaData } from '../data/qaData.js';

/** 搜尋詞在文字中的命中片段以 <mark> 標出，讓玩家一眼看到關鍵字落點 */
function highlightMatch(text, term) {
  const query = term.trim();
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.split(new RegExp(`(${escaped})`, 'gi')).map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="rounded bg-brand-gold/30 px-0.5 text-brand-gold">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function matchesQuery(qa, term) {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return `${qa.q}${qa.a}`.toLowerCase().includes(query);
}

const CATEGORY_DECOR_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='16' viewBox='0 0 30 16'%3E%3Cpath d='M0,8 Q7.5,0 15,8 T30,8' fill='none' stroke='%23ffd700' stroke-width='1.5'/%3E%3Cpath d='M0,8 Q7.5,16 15,8 T30,8' fill='none' stroke='%23ffd700' stroke-width='1.5'/%3E%3C/svg%3E\")";

/**
 * 常見問題：搜尋（同時比對問題與答案）＋教團篩選晶片。
 * 關鍵字常跨教團分散（如「控訴」散在 4 個分類），故以搜尋為主、分類為輔。
 */
export default function QASection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  /** 玩家明確點開／收合的項目；搜尋時預設展開，此 Map 為覆寫 */
  const [openOverrides, setOpenOverrides] = useState(() => new Map());

  const isSearching = searchTerm.trim() !== '';

  // 換搜尋詞時清掉手動覆寫，讓「命中即展開」的預設重新生效
  useEffect(() => {
    setOpenOverrides(new Map());
  }, [searchTerm]);

  const toggle = useCallback((key, currentlyOpen) => {
    setOpenOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, !currentlyOpen);
      return next;
    });
  }, []);

  /** 各分類在目前搜尋詞下的命中數，讓晶片直接顯示答案落在哪個教團 */
  const countsByCategory = useMemo(() => {
    const counts = new Map();
    for (const category of qaData) {
      counts.set(
        category.category,
        category.questions.filter((qa) => matchesQuery(qa, searchTerm)).length,
      );
    }
    return counts;
  }, [searchTerm]);

  const visibleCategories = useMemo(
    () =>
      qaData
        .filter((category) => !activeCategory || category.category === activeCategory)
        .map((category) => ({
          ...category,
          questions: category.questions.filter((qa) => matchesQuery(qa, searchTerm)),
        }))
        .filter((category) => category.questions.length > 0),
    [searchTerm, activeCategory],
  );

  const totalMatches = visibleCategories.reduce((n, c) => n + c.questions.length, 0);
  const totalQuestions = useMemo(() => qaData.reduce((n, c) => n + c.questions.length, 0), []);

  const clearFilters = () => {
    setSearchTerm('');
    setActiveCategory('');
  };

  return (
    <div className="qa-container mx-auto max-w-[800px] px-2 py-2">
      {/* 搜尋 */}
      <div className="relative mb-3">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          strokeWidth={2.25}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="搜尋問題或答案…"
          aria-label="搜尋常見問題"
          className="w-full rounded-md border border-[#444] bg-[#222] py-3 pl-9 pr-10 text-base text-white outline-none transition placeholder:text-gray-400 focus:border-brand-gold"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            aria-label="清除搜尋"
            className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#aaa] transition hover:text-white"
          >
            <X aria-hidden className="h-4 w-4" strokeWidth={2.25} />
          </button>
        )}
      </div>

      {/* 教團篩選晶片；括號內為目前搜尋下該分類的命中數 */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory('')}
          aria-pressed={activeCategory === ''}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            activeCategory === ''
              ? 'border-brand-gold bg-brand-gold text-neutral-900'
              : 'border-[#444] bg-[#2a2a2a] text-[#e0e0e0] hover:border-brand-gold'
          }`}
        >
          全部（{isSearching ? totalMatches : totalQuestions}）
        </button>
        {qaData.map((category) => {
          const count = countsByCategory.get(category.category) ?? 0;
          const isActive = activeCategory === category.category;
          return (
            <button
              key={category.category}
              type="button"
              onClick={() => setActiveCategory(isActive ? '' : category.category)}
              aria-pressed={isActive}
              disabled={count === 0}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                isActive
                  ? 'border-brand-gold bg-brand-gold text-neutral-900'
                  : 'border-[#444] bg-[#2a2a2a] text-[#e0e0e0] hover:border-brand-gold'
              }`}
            >
              {category.category}（{count}）
            </button>
          );
        })}
      </div>

      {/* 結果統計 */}
      {(isSearching || activeCategory) && (
        <div className="mb-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-gray-400">
            共 <span className="font-bold text-brand-gold">{totalMatches}</span> 題符合
          </span>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded border border-[#555] px-2 py-1 text-xs text-gray-300 transition hover:border-brand-gold hover:text-brand-gold"
          >
            清除條件
          </button>
        </div>
      )}

      {totalMatches === 0 ? (
        <div className="rounded-lg border border-dashed border-[#444] px-4 py-12 text-center">
          <p className="text-gray-300">找不到符合的問題</p>
          <p className="mt-2 text-sm text-gray-500">試試其他關鍵字，或改用教團篩選瀏覽</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 rounded border border-brand-gold px-4 py-2 text-sm font-bold text-brand-gold transition hover:bg-brand-gold hover:text-neutral-900"
          >
            清除條件
          </button>
        </div>
      ) : (
        visibleCategories.map((cat) => (
          <div key={cat.category} className="qa-category mb-9">
            <h2 className="qa-category-title mb-4 flex items-center justify-center gap-4 text-center text-xl font-bold text-brand-gold">
              <span
                className="hidden h-4 max-w-[250px] flex-1 bg-[length:30px_16px] bg-right bg-repeat-x opacity-80 sm:flex"
                style={{
                  backgroundImage: CATEGORY_DECOR_SVG,
                  maskImage: 'linear-gradient(to right, transparent, black)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black)',
                }}
                aria-hidden
              />
              <img
                className="qa-faction-icon h-7 w-auto shrink-0 object-contain"
                src={`images/icons/${cat.category}左.webp`}
                width={28}
                height={28}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span>{cat.category}</span>
              <img
                className="qa-faction-icon h-7 w-auto shrink-0 object-contain"
                src={`images/icons/${cat.category}右.webp`}
                width={28}
                height={28}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span
                className="hidden h-4 max-w-[250px] flex-1 bg-[length:30px_16px] bg-left bg-repeat-x opacity-80 sm:flex"
                style={{
                  backgroundImage: CATEGORY_DECOR_SVG,
                  maskImage: 'linear-gradient(to left, transparent, black)',
                  WebkitMaskImage: 'linear-gradient(to left, transparent, black)',
                }}
                aria-hidden
              />
            </h2>

            {cat.questions.map((qa) => {
              const key = `${cat.category}::${qa.q}`;
              // 搜尋時預設展開（找到題目就該看到答案），玩家仍可手動收合
              const isActive = openOverrides.has(key) ? openOverrides.get(key) : isSearching;
              return (
                <div
                  key={key}
                  className={`qa-item mb-2.5 overflow-hidden rounded-lg border bg-[#252525] transition-colors duration-300 ${
                    isActive ? 'border-brand-gold' : 'border-[#333] hover:border-[#555]'
                  }`}
                >
                  <button
                    type="button"
                    className={`qa-question flex w-full select-none items-center justify-between gap-3 bg-[#2a2a2a] px-4 py-4 text-left text-[15px] font-bold transition-colors ${
                      isActive ? 'text-brand-gold' : 'text-[#e0e0e0]'
                    }`}
                    onClick={() => toggle(key, isActive)}
                    aria-expanded={isActive}
                  >
                    <span>{highlightMatch(qa.q, searchTerm)}</span>
                    <ChevronDown
                      aria-hidden
                      className={`h-[15px] w-[15px] shrink-0 text-brand-gold transition-transform duration-300 ease-out ${
                        isActive ? 'rotate-180' : ''
                      }`}
                      strokeWidth={2.5}
                    />
                  </button>
                  <div
                    className={`qa-answer overflow-hidden bg-[#1e1e1e] text-sm leading-relaxed text-[#ccc] transition-[max-height,padding] duration-300 ease-out ${
                      isActive
                        ? 'max-h-[1000px] border-t border-[#333] px-4 py-4'
                        : 'max-h-0 px-4 py-0'
                    }`}
                  >
                    {highlightMatch(qa.a, searchTerm)}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

import { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { qaData } from '../data/qaData.js';

/**
 * 對齊舊版 qa-item active：點問題列切換展開／收合
 */
export default function QASection() {
  const [activeKeys, setActiveKeys] = useState(() => new Set());

  const toggle = useCallback((key) => {
    setActiveKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="qa-container max-w-[800px] mx-auto px-2 py-2">
      {qaData.map((cat) => (
        <div key={cat.category} className="qa-category mb-9">
          <h2 className="qa-category-title flex items-center justify-center gap-4 mb-4 text-center text-xl text-brand-gold font-bold">
            <span
              className="hidden sm:flex flex-1 max-w-[250px] h-4 opacity-80 bg-repeat-x bg-[length:30px_16px] bg-right"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='16' viewBox='0 0 30 16'%3E%3Cpath d='M0,8 Q7.5,0 15,8 T30,8' fill='none' stroke='%23ffd700' stroke-width='1.5'/%3E%3Cpath d='M0,8 Q7.5,16 15,8 T30,8' fill='none' stroke='%23ffd700' stroke-width='1.5'/%3E%3C/svg%3E")`,
                maskImage: 'linear-gradient(to right, transparent, black)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black)',
              }}
              aria-hidden
            />
            <img
              className="qa-faction-icon h-7 w-auto object-contain shrink-0"
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
              className="qa-faction-icon h-7 w-auto object-contain shrink-0"
              src={`images/icons/${cat.category}右.webp`}
              width={28}
              height={28}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span
              className="hidden sm:flex flex-1 max-w-[250px] h-4 opacity-80 bg-repeat-x bg-[length:30px_16px] bg-left"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='16' viewBox='0 0 30 16'%3E%3Cpath d='M0,8 Q7.5,0 15,8 T30,8' fill='none' stroke='%23ffd700' stroke-width='1.5'/%3E%3Cpath d='M0,8 Q7.5,16 15,8 T30,8' fill='none' stroke='%23ffd700' stroke-width='1.5'/%3E%3C/svg%3E")`,
                maskImage: 'linear-gradient(to left, transparent, black)',
                WebkitMaskImage: 'linear-gradient(to left, transparent, black)',
              }}
              aria-hidden
            />
          </h2>

          {cat.questions.map((qa) => {
            const key = `${cat.category}::${qa.q}`;
            const isActive = activeKeys.has(key);
            return (
              <div
                key={key}
                className={`qa-item rounded-lg mb-2.5 overflow-hidden border transition-colors duration-300 bg-[#252525] ${
                  isActive ? 'border-brand-gold' : 'border-[#333] hover:border-[#555]'
                }`}
              >
                <button
                  type="button"
                  className={`qa-question flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-[15px] font-bold select-none bg-[#2a2a2a] transition-colors ${
                    isActive ? 'text-brand-gold' : 'text-[#e0e0e0]'
                  }`}
                  onClick={() => toggle(key)}
                  aria-expanded={isActive}
                >
                  <span>{qa.q}</span>
                  <ChevronDown
                    aria-hidden
                    className={`shrink-0 h-[15px] w-[15px] text-brand-gold transition-transform duration-300 ease-out ${
                      isActive ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2.5}
                  />
                </button>
                <div
                  className={`qa-answer overflow-hidden bg-[#1e1e1e] text-[#ccc] text-sm leading-relaxed transition-[max-height,padding] duration-300 ease-out ${
                    isActive
                      ? 'max-h-[1000px] border-t border-[#333] px-4 py-4'
                      : 'max-h-0 py-0 px-4'
                  }`}
                >
                  {qa.a}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

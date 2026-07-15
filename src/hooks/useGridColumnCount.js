import { useEffect, useState } from 'react';

/** 與 CardGallery 預設 gridClass、App 載入骨架的欄數斷點一致 */
const BREAKPOINTS = [
  [1280, 6],
  [1024, 5],
  [768, 4],
  [640, 3],
  [0, 2],
];

function columnsForWidth(width) {
  for (const [min, cols] of BREAKPOINTS) {
    if (width >= min) return cols;
  }
  return 2;
}

/** @param {number | undefined} override 固定欄數（如組牌池 lg:3 欄） */
export function useGridColumnCount(override) {
  const [columnCount, setColumnCount] = useState(() =>
    override ?? columnsForWidth(typeof window !== 'undefined' ? window.innerWidth : 1024),
  );

  useEffect(() => {
    if (override != null) {
      setColumnCount(override);
      return undefined;
    }

    const update = () => setColumnCount(columnsForWidth(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [override]);

  return columnCount;
}

import { useEffect, useState } from 'react';

const BREAKPOINTS = [
  [1536, 6],
  [1280, 5],
  [1024, 4],
  [768, 3],
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

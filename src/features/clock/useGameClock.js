import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createInitialState,
  reduceEndTurn,
  reducePauseFromRunning,
  reduceStart,
  reduceTick,
  reduceToggleRun,
} from './clockEngine.js';

/**
 * @param {import('./clockUtils.js').ClockStatus} status
 * @param {{ current: import('./clockUtils.js').ClockStatus }} statusRef
 */
function syncStatusRef(status, statusRef) {
  statusRef.current = status;
}

/**
 * 以 performance.now() 追蹤實際經過時間；rAF 僅用於刷新 UI。
 */
export function useGameClock() {
  const [state, setState] = useState(createInitialState);
  const lastTickRef = useRef(0);
  const statusRef = useRef(state.status);

  /**
   * statusRef 雙層同步：
   * - useLayoutEffect：正確性保證，commit 後與 state.status 對齊（兜底）。
   * - updater / rAF 內賦值：效能優化，讓排程中的下一幀 rAF 能在同一幀內
   *   讀到最新 status，避免 running 狀態多扣一次時間。
   */
  useLayoutEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'running') return undefined;

    lastTickRef.current = performance.now();
    let rafId = 0;

    const frame = () => {
      if (statusRef.current !== 'running') return;

      const now = performance.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      setState((prev) => {
        const next = reduceTick(prev, elapsed);
        if (next.status === 'finished' && prev.status === 'running') {
          syncStatusRef('finished', statusRef);
        }
        return next;
      });

      if (statusRef.current === 'running') {
        rafId = requestAnimationFrame(frame);
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [state.status]);

  const start = useCallback(() => {
    setState((prev) => reduceStart(prev));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running') return prev;
      const next = reducePauseFromRunning(prev, performance.now() - lastTickRef.current);
      lastTickRef.current = performance.now();
      syncStatusRef(next.status, statusRef);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    lastTickRef.current = 0;
    setState(createInitialState);
  }, []);

  const endTurn = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running') return prev;

      const now = performance.now();
      const elapsed = now - lastTickRef.current;
      // 切換玩家前更新基準點；下一幀 elapsed 會涵蓋 endTurn 執行期間的數毫秒，屬刻意取捨。
      lastTickRef.current = now;

      const next = reduceEndTurn(prev, elapsed);
      if (next.status === 'finished') {
        syncStatusRef('finished', statusRef);
      }
      return next;
    });
  }, []);

  const toggleRun = useCallback(() => {
    setState((prev) => {
      const next = reduceToggleRun(prev, performance.now() - lastTickRef.current);
      if (prev.status === 'running') {
        lastTickRef.current = performance.now();
        syncStatusRef(next.status, statusRef);
      }
      return next;
    });
  }, []);

  return {
    state,
    start,
    pause,
    reset,
    endTurn,
    toggleRun,
  };
}

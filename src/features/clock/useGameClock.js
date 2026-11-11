import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  createInitialState,
  reduceEndTurn,
  reduceSetStartingPlayer,
  reduceTick,
  reduceToggleRun,
} from './clockEngine.js';
import { loadClockFromStorage, saveClockToStorage } from './clockPersistence.js';

/**
 * @param {import('./clockUtils.js').ClockStatus} status
 * @param {{ current: import('./clockUtils.js').ClockStatus }} statusRef
 */
function syncStatusRef(status, statusRef) {
  statusRef.current = status;
}

/** 首次載入：有存檔就接續（計時中會扣掉離開期間的真實時間），否則從頭開始 */
function createRestoredState() {
  return loadClockFromStorage() ?? createInitialState();
}

/**
 * 以 performance.now() 追蹤實際經過時間；rAF 僅用於刷新 UI。
 */
export function useGameClock() {
  const [state, setState] = useState(createRestoredState);
  const lastTickRef = useRef(0);
  const statusRef = useRef(state.status);
  const stateRef = useRef(state);

  useLayoutEffect(() => {
    stateRef.current = state;
  });

  /**
   * 存檔只在「狀態轉換」時寫：開始、暫停、換手、結束、重設。
   * 計時中每幀的剩餘時間不必寫——還原時以 savedAt 推算經過時間即可，
   * 避免每秒數十次寫 localStorage。離開頁面前再補存一次最新值。
   */
  useEffect(() => {
    saveClockToStorage(stateRef.current);
  }, [state.status, state.activePlayer, state.playerA.moves, state.playerB.moves, state.winner]);

  useEffect(() => {
    const flush = () => saveClockToStorage(stateRef.current);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

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

  const reset = useCallback(() => {
    lastTickRef.current = 0;
    setState(createInitialState);
  }, []);

  const setStartingPlayer = useCallback((playerId) => {
    setState((prev) => reduceSetStartingPlayer(prev, playerId));
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
    reset,
    setStartingPlayer,
    endTurn,
    toggleRun,
  };
}

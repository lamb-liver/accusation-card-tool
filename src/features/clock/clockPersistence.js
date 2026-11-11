import { createInitialState } from './clockUtils.js';
import { reduceTick } from './clockEngine.js';

/** localStorage key；格式變更時改版號，舊資料直接忽略 */
export const CLOCK_STORAGE_KEY = 'accusation-clock-v1';

/** 超過這個時間沒回來的對局視為已結束，不再還原（避免隔天打開還在倒數） */
export const CLOCK_RESTORE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const STATUSES = new Set(['idle', 'running', 'paused', 'finished']);
const PLAYERS = new Set(['A', 'B']);

/**
 * @param {unknown} player
 * @returns {player is import('./clockUtils.js').PlayerState}
 */
function isPlayerState(player) {
  return (
    !!player &&
    typeof player === 'object' &&
    Number.isFinite(player.remainingMs) &&
    player.remainingMs >= 0 &&
    Number.isInteger(player.moves) &&
    player.moves >= 0
  );
}

/**
 * @param {unknown} state
 * @returns {state is import('./clockUtils.js').GameClockState}
 */
function isClockState(state) {
  if (!state || typeof state !== 'object') return false;
  if (!isPlayerState(state.playerA) || !isPlayerState(state.playerB)) return false;
  if (!PLAYERS.has(state.activePlayer) || !STATUSES.has(state.status)) return false;
  if (state.status === 'finished') return PLAYERS.has(state.winner);
  return state.winner === null;
}

/**
 * 是否為剛建立、尚未操作過的狀態（不必存）。
 * @param {import('./clockUtils.js').GameClockState} state
 */
export function isPristineClock(state) {
  const initial = createInitialState();
  return (
    state.status === 'idle' &&
    state.activePlayer === initial.activePlayer &&
    state.playerA.remainingMs === initial.playerA.remainingMs &&
    state.playerB.remainingMs === initial.playerB.remainingMs &&
    state.playerA.moves === 0 &&
    state.playerB.moves === 0
  );
}

/**
 * @param {import('./clockUtils.js').GameClockState} state
 * @param {number} nowMs Date.now()
 * @returns {string}
 */
export function serializeClock(state, nowMs) {
  return JSON.stringify({ savedAt: nowMs, state });
}

/**
 * 還原存檔。計時中的對局會扣掉離開期間經過的真實時間（重新整理、分頁被回收），
 * 扣到 0 則判定該方超時。資料不合法、過舊或時間倒流時回傳 null。
 *
 * @param {string | null} raw
 * @param {number} nowMs Date.now()
 * @returns {import('./clockUtils.js').GameClockState | null}
 */
export function restoreClock(raw, nowMs) {
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || !Number.isFinite(parsed.savedAt) || !isClockState(parsed.state)) return null;

  const awayMs = nowMs - parsed.savedAt;
  if (awayMs > CLOCK_RESTORE_MAX_AGE_MS) return null;

  const state = parsed.state;
  if (state.status !== 'running') return state;
  // 裝置時間被往回調時不加時間，只當作沒有經過
  return reduceTick(state, Math.max(0, awayMs));
}

/** @returns {import('./clockUtils.js').GameClockState | null} */
export function loadClockFromStorage() {
  try {
    return restoreClock(window.localStorage.getItem(CLOCK_STORAGE_KEY), Date.now());
  } catch {
    return null;
  }
}

/** @param {import('./clockUtils.js').GameClockState} state */
export function saveClockToStorage(state) {
  try {
    if (isPristineClock(state)) {
      window.localStorage.removeItem(CLOCK_STORAGE_KEY);
    } else {
      window.localStorage.setItem(CLOCK_STORAGE_KEY, serializeClock(state, Date.now()));
    }
  } catch {
    // 無痕模式或容量已滿：計時照常運作，只是重新整理後不會還原
  }
}

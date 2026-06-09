/** 每方初始分鐘數 */
export const INITIAL_MINUTES = 20;

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const INITIAL_TIME_MS = INITIAL_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;

/** @typedef {'A' | 'B'} PlayerId */
/** @typedef {'idle' | 'running' | 'paused' | 'finished'} ClockStatus */

/**
 * @typedef {Object} PlayerState
 * @property {number} remainingMs
 * @property {number} moves
 */

/**
 * 狀態不變量：`status === 'finished'` 時 `winner` 必為 `PlayerId`；其餘狀態 `winner` 為 `null`。
 *
 * @typedef {Object} GameClockState
 * @property {PlayerState} playerA
 * @property {PlayerState} playerB
 * @property {PlayerId} activePlayer
 * @property {ClockStatus} status
 * @property {PlayerId | null} winner
 */

/** @returns {GameClockState} */
export function createInitialState() {
  return {
    playerA: { remainingMs: INITIAL_TIME_MS, moves: 0 },
    playerB: { remainingMs: INITIAL_TIME_MS, moves: 0 },
    activePlayer: 'A',
    status: 'idle',
    winner: null,
  };
}

/**
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
  if (!Number.isFinite(ms)) return '--:--';

  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * @param {GameClockState} state
 * @param {PlayerId} playerId
 * @returns {PlayerState}
 */
export function getPlayer(state, playerId) {
  return playerId === 'A' ? state.playerA : state.playerB;
}

/**
 * 所有呼叫端皆傳入含欄位的字面量 patch；空物件不是正常路徑，無需 catch。
 *
 * @param {GameClockState} state
 * @param {PlayerId} playerId
 * @param {{ remainingMs?: number, moves?: number }} patch
 * @returns {GameClockState}
 */
export function patchPlayer(state, playerId, patch) {
  /* invariant: 呼叫端保證 patch 至少含 remainingMs 或 moves */
  if (!patch || Object.keys(patch).length === 0) {
    throw new Error('patchPlayer: patch must include at least one field');
  }

  const key = playerId === 'A' ? 'playerA' : 'playerB';
  return { ...state, [key]: { ...state[key], ...patch } };
}

/**
 * @param {PlayerId} playerId
 * @returns {PlayerId}
 */
export function otherPlayer(playerId) {
  return playerId === 'A' ? 'B' : 'A';
}

import {
  createInitialState,
  getPlayer,
  otherPlayer,
  patchPlayer,
} from './clockUtils.js';

/**
 * @param {import('./clockUtils.js').GameClockState} prev
 * @returns {import('./clockUtils.js').GameClockState}
 */
export function reduceStart(prev) {
  if (prev.status === 'finished' || prev.status === 'running') return prev;
  return { ...prev, status: 'running' };
}

/**
 * @param {import('./clockUtils.js').GameClockState} prev
 * @param {number} elapsedMs
 * @returns {import('./clockUtils.js').GameClockState}
 */
export function reducePauseFromRunning(prev, elapsedMs) {
  if (prev.status !== 'running') return prev;

  const active = prev.activePlayer;
  const player = getPlayer(prev, active);
  const nextRemaining = Math.max(0, player.remainingMs - elapsedMs);
  const finished = nextRemaining <= 0;

  return {
    ...patchPlayer(prev, active, { remainingMs: nextRemaining }),
    status: finished ? 'finished' : 'paused',
    winner: finished ? otherPlayer(active) : null,
  };
}

/**
 * @param {import('./clockUtils.js').GameClockState} prev
 * @param {number} elapsedMs
 * @returns {import('./clockUtils.js').GameClockState}
 */
export function reduceTick(prev, elapsedMs) {
  if (prev.status !== 'running') return prev;

  const active = prev.activePlayer;
  const player = getPlayer(prev, active);
  const nextRemaining = player.remainingMs - elapsedMs;

  if (nextRemaining <= 0) {
    return {
      ...patchPlayer(prev, active, { remainingMs: 0 }),
      status: 'finished',
      winner: otherPlayer(active),
    };
  }

  return patchPlayer(prev, active, { remainingMs: nextRemaining });
}

/**
 * @param {import('./clockUtils.js').GameClockState} prev
 * @param {number} elapsedMs
 * @returns {import('./clockUtils.js').GameClockState}
 */
export function reduceEndTurn(prev, elapsedMs) {
  if (prev.status !== 'running') return prev;

  const active = prev.activePlayer;
  const player = getPlayer(prev, active);
  const nextRemaining = player.remainingMs - elapsedMs;

  if (nextRemaining <= 0) {
    return {
      ...patchPlayer(prev, active, { remainingMs: 0 }),
      status: 'finished',
      winner: otherPlayer(active),
    };
  }

  return {
    ...patchPlayer(prev, active, {
      remainingMs: nextRemaining,
      moves: player.moves + 1,
    }),
    activePlayer: otherPlayer(active),
  };
}

/**
 * @param {import('./clockUtils.js').GameClockState} prev
 * @param {number} elapsedMs 暫停時自上次 tick 以來的經過時間
 * @returns {import('./clockUtils.js').GameClockState}
 */
export function reduceToggleRun(prev, elapsedMs) {
  if (prev.status === 'running') {
    return reducePauseFromRunning(prev, elapsedMs);
  }
  if (prev.status === 'idle' || prev.status === 'paused') {
    return { ...prev, status: 'running' };
  }
  return prev;
}

export { createInitialState };

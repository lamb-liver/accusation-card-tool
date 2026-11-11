import assert from 'node:assert/strict';
import {
  createInitialState,
  formatTime,
  getPlayer,
  otherPlayer,
  patchPlayer,
  INITIAL_MINUTES,
} from '../src/features/clock/clockUtils.js';
import {
  reduceEndTurn,
  reducePauseFromRunning,
  reduceSetStartingPlayer,
  reduceTick,
  reduceToggleRun,
} from '../src/features/clock/clockEngine.js';
import {
  CLOCK_RESTORE_MAX_AGE_MS,
  isPristineClock,
  restoreClock,
  serializeClock,
} from '../src/features/clock/clockPersistence.js';

const MS_PER_MINUTE = 60_000;
const INITIAL_MS = INITIAL_MINUTES * MS_PER_MINUTE;

// ── clockUtils ─────────────────────────────────────────────────────────────

const initial = createInitialState();
assert(initial.status === 'idle', 'initial status idle');
assert(initial.playerA.remainingMs === INITIAL_MS, 'initial playerA time');
assert(initial.playerB.remainingMs === INITIAL_MS, 'initial playerB time');
assert(initial.winner === null, 'initial winner null');
assert(initial.activePlayer === 'A', 'initial active A');

assert(formatTime(INITIAL_MS) === '20:00', 'formatTime 20:00');
assert(formatTime(65_000) === '1:05', 'formatTime 1:05');
assert(formatTime(0) === '0:00', 'formatTime zero');
assert(formatTime(-1000) === '0:00', 'formatTime negative clamped');
assert(formatTime(NaN) === '--:--', 'formatTime NaN');
assert(formatTime(Infinity) === '--:--', 'formatTime Infinity');

assert(getPlayer(initial, 'A') === initial.playerA, 'getPlayer A');
assert(otherPlayer('A') === 'B', 'otherPlayer A');
assert(otherPlayer('B') === 'A', 'otherPlayer B');

try {
  patchPlayer(initial, 'A', {});
  assert.fail('patchPlayer empty patch should throw');
} catch (error) {
  assert(error instanceof Error, 'patchPlayer throws Error');
}

const patched = patchPlayer(initial, 'B', { moves: 2 });
assert(patched.playerB.moves === 2, 'patchPlayer applies moves');
assert(initial.playerB.moves === 0, 'patchPlayer immutable');

// ── clockEngine: start / pause / reset flow ────────────────────────────────

let state = createInitialState();

state = reduceToggleRun(state, 0);
assert(state.status === 'running', 'reduceToggleRun idle → running');

state = reducePauseFromRunning(state, 30_000);
assert(state.status === 'paused', 'reducePause deducts to paused');
assert(state.playerA.remainingMs === INITIAL_MS - 30_000, 'reducePause playerA remaining');

state = reduceToggleRun(state, 0);
assert(state.status === 'running', 'reduceToggleRun paused → running');

state = reduceToggleRun(state, 5_000);
assert(state.status === 'paused', 'reduceToggleRun running → paused');
assert(state.playerA.remainingMs === INITIAL_MS - 35_000, 'reduceToggleRun pause deducts');

state = createInitialState();
state = reduceToggleRun(state, 0);
state = reducePauseFromRunning(state, INITIAL_MS);
assert(state.status === 'finished', 'reducePause timeout → finished');
assert(state.winner === 'B', 'reducePause timeout winner B');
assert(state.playerA.remainingMs === 0, 'reducePause timeout zero remaining');

// ── clockEngine: starting player ──────────────────────────────────────────

state = createInitialState();
state = reduceSetStartingPlayer(state, 'B');
assert(state.activePlayer === 'B', 'reduceSetStartingPlayer switches idle active player');
assert(state.playerA.moves === 0 && state.playerB.moves === 0, 'reduceSetStartingPlayer preserves moves');

const startingPlayerState = state;
assert(
  reduceSetStartingPlayer(startingPlayerState, 'B') === startingPlayerState,
  'reduceSetStartingPlayer same player no-op',
);

state = reduceToggleRun(state, 0);
assert(state.activePlayer === 'B', 'reduceToggleRun preserves selected active player');
assert(
  reduceSetStartingPlayer(state, 'A') === state,
  'reduceSetStartingPlayer running no-op',
);

// ── clockEngine: tick ──────────────────────────────────────────────────────

state = createInitialState();
state = { ...state, status: 'running' };
state = reduceTick(state, 1_000);
assert(state.playerA.remainingMs === INITIAL_MS - 1_000, 'reduceTick deducts active');

state = reduceTick(state, INITIAL_MS);
assert(state.status === 'finished', 'reduceTick timeout finished');
assert(state.winner === 'B', 'reduceTick timeout winner');

// ── clockEngine: endTurn ───────────────────────────────────────────────────

state = createInitialState();
state = { ...state, status: 'running' };
state = reduceEndTurn(state, 2_000);
assert(state.activePlayer === 'B', 'reduceEndTurn switches to B');
assert(state.playerA.moves === 1, 'reduceEndTurn increments moves');
assert(state.playerA.remainingMs === INITIAL_MS - 2_000, 'reduceEndTurn deducts');

state = reduceEndTurn(state, 0);
assert(state.activePlayer === 'A', 'reduceEndTurn switches back to A');
assert(state.playerB.moves === 1, 'reduceEndTurn B moves');

state = createInitialState();
state = { ...state, status: 'running' };
state = reduceEndTurn(state, INITIAL_MS);
assert(state.status === 'finished', 'reduceEndTurn timeout finished');

// ── clockEngine: guards ────────────────────────────────────────────────────

state = createInitialState();
assert(reduceTick(state, 1_000) === state, 'reduceTick idle no-op');
assert(reduceEndTurn(state, 1_000) === state, 'reduceEndTurn idle no-op');
assert(reducePauseFromRunning(state, 1_000) === state, 'reducePause idle no-op');

state = { ...createInitialState(), status: 'finished', winner: 'A' };
assert(reduceToggleRun(state, 0) === state, 'reduceToggleRun finished no-op');

// ── integrated scenario ────────────────────────────────────────────────────

state = createInitialState();
state = reduceToggleRun(state, 0);
state = reduceTick(state, 10_000);
state = reduceEndTurn(state, 0);
assert(state.activePlayer === 'B' && state.playerA.moves === 1, 'scenario turn switch');
state = reduceToggleRun(state, 3_000);
assert(state.status === 'paused' && state.playerB.remainingMs === INITIAL_MS - 3_000, 'scenario pause B');
state = reduceToggleRun(state, 0);
state = reduceTick(state, 1_000);
state = reducePauseFromRunning(state, 0);
assert(state.status === 'paused', 'scenario pause after tick');
state = reduceToggleRun(state, 0);
assert(state.status === 'running', 'scenario resume after pause');

state = createInitialState();
state = reduceToggleRun(state, 0);
state = reducePauseFromRunning(state, 0);
assert(state.status === 'paused', 'scenario start then pause');
state = reduceToggleRun(state, 0);
assert(state.status === 'running', 'scenario start-pause-resume');

// ── clockPersistence：重新整理後還原 ───────────────────────────────────────

const T0 = 1_800_000_000_000;
assert(isPristineClock(createInitialState()), 'fresh clock is pristine');
assert(!isPristineClock(reduceToggleRun(createInitialState(), 0)), 'started clock is not pristine');

const runningSaved = reduceToggleRun(createInitialState(), 0);
const restoredRunning = restoreClock(serializeClock(runningSaved, T0), T0 + 30_000);
assert(restoredRunning?.status === 'running', 'running clock keeps running after restore');
assert(restoredRunning.playerA.remainingMs === INITIAL_MS - 30_000, 'away time is charged to the active player');
assert(restoredRunning.playerB.remainingMs === INITIAL_MS, 'inactive player time untouched');

const timedOut = restoreClock(serializeClock(runningSaved, T0), T0 + INITIAL_MS + 1);
assert(timedOut?.status === 'finished' && timedOut.winner === 'B', 'restore past zero finishes the game');

const pausedSaved = reduceToggleRun(reduceToggleRun(createInitialState(), 0), 5_000);
const restoredPaused = restoreClock(serializeClock(pausedSaved, T0), T0 + 600_000);
assert(restoredPaused?.status === 'paused', 'paused clock restores paused');
assert(restoredPaused.playerA.remainingMs === INITIAL_MS - 5_000, 'paused clock does not lose away time');

const backwards = restoreClock(serializeClock(runningSaved, T0), T0 - 60_000);
assert(backwards?.playerA.remainingMs === INITIAL_MS, 'device clock moved back does not add time');

assert(restoreClock(serializeClock(runningSaved, T0), T0 + CLOCK_RESTORE_MAX_AGE_MS + 1) === null, 'stale save ignored');
assert(restoreClock(null, T0) === null, 'missing save');
assert(restoreClock('{not json', T0) === null, 'corrupt save');
assert(restoreClock(JSON.stringify({ savedAt: T0, state: { status: 'running' } }), T0) === null, 'malformed save');
assert(
  restoreClock(JSON.stringify({ savedAt: T0, state: { ...runningSaved, status: 'finished', winner: null } }), T0) === null,
  'finished without winner rejected',
);

console.log('OK: clock tests passed');

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
  reduceStart,
  reduceTick,
  reduceToggleRun,
} from '../src/features/clock/clockEngine.js';

let failed = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed += 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

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
  fail('patchPlayer empty patch should throw');
} catch (error) {
  assert(error instanceof Error, 'patchPlayer throws Error');
}

const patched = patchPlayer(initial, 'B', { moves: 2 });
assert(patched.playerB.moves === 2, 'patchPlayer applies moves');
assert(initial.playerB.moves === 0, 'patchPlayer immutable');

// ── clockEngine: start / pause / reset flow ────────────────────────────────

let state = createInitialState();

state = reduceStart(state);
assert(state.status === 'running', 'reduceStart idle → running');
assert(reduceStart(state) === state, 'reduceStart no-op while running');

state = reducePauseFromRunning(state, 30_000);
assert(state.status === 'paused', 'reducePause deducts to paused');
assert(state.playerA.remainingMs === INITIAL_MS - 30_000, 'reducePause playerA remaining');

state = reduceToggleRun(state, 0);
assert(state.status === 'running', 'reduceToggleRun paused → running');

state = reduceToggleRun(state, 5_000);
assert(state.status === 'paused', 'reduceToggleRun running → paused');
assert(state.playerA.remainingMs === INITIAL_MS - 35_000, 'reduceToggleRun pause deducts');

state = createInitialState();
state = reduceStart(state);
state = reducePauseFromRunning(state, INITIAL_MS);
assert(state.status === 'finished', 'reducePause timeout → finished');
assert(state.winner === 'B', 'reducePause timeout winner B');
assert(state.playerA.remainingMs === 0, 'reducePause timeout zero remaining');

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
assert(reduceStart(state) === state, 'reduceStart finished no-op');
assert(reduceToggleRun(state, 0) === state, 'reduceToggleRun finished no-op');

// ── integrated scenario ────────────────────────────────────────────────────

state = createInitialState();
state = reduceStart(state);
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
state = reduceStart(state);
state = reducePauseFromRunning(state, 0);
assert(state.status === 'paused', 'scenario start then pause');
state = reduceToggleRun(state, 0);
assert(state.status === 'running', 'scenario start-pause-resume');

if (failed > 0) {
  console.error(`\n${failed} clock test(s) failed`);
  process.exit(1);
}

console.log('OK: clock tests passed');

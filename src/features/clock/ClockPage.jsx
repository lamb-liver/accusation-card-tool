import { useEffect, useRef, useState } from 'react';
import { Coins, Pause, Play, RotateCcw } from 'lucide-react';
import { formatTime, INITIAL_MINUTES } from './clockUtils.js';
import { useGameClock } from './useGameClock.js';
import './ClockPage.css';

const LOW_TIME_MS = 60_000;
const COIN_FLIP_MS = 1100;
const COIN_FACE_BY_RESULT = {
  heads: { label: '正面' },
  tails: { label: '反面' },
};

function getRandomCoinResult() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % 2 === 0 ? 'heads' : 'tails';
  }

  return Math.random() < 0.5 ? 'heads' : 'tails';
}

function getPlayerATurnOrderLabel(activePlayer, selectedFirstPlayer) {
  if (selectedFirstPlayer === 'A') return '已設定玩家 A 先手';
  if (selectedFirstPlayer === 'B') return '已設定玩家 A 後手';
  return `目前玩家 ${activePlayer} 先手`;
}

function PlayerPanel({ playerId, label, player, isActive, isRunning, onEndTurn }) {
  const isLow = player.remainingMs > 0 && player.remainingMs <= LOW_TIME_MS;
  const canTap = isActive && isRunning;

  const className = [
    'clock-player',
    playerId === 'B' ? 'clock-player--top' : '',
    isActive ? 'clock-player--active' : 'clock-player--inactive',
    canTap ? 'clock-player--clickable' : '',
    isLow ? 'clock-player--low' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={onEndTurn}
      disabled={!canTap}
      aria-current={isActive ? 'true' : undefined}
      aria-label={
        canTap
          ? `${label}，剩餘 ${formatTime(player.remainingMs)}，點擊結束回合`
          : `${label}，剩餘 ${formatTime(player.remainingMs)}`
      }
    >
      <span className="clock-player__face">
        {isActive && isRunning && (
          <span className="clock-player__turn-badge" aria-hidden>
            輪到你
          </span>
        )}
        <span className="clock-player__label">{label}</span>
        <span className="clock-player__time">{formatTime(player.remainingMs)}</span>
        <span className="clock-player__meta">回合 {player.moves}</span>
      </span>
    </button>
  );
}

export default function ClockPage() {
  const { state, toggleRun, reset, setStartingPlayer, endTurn } = useGameClock();
  const { playerA, playerB, activePlayer, status, winner } = state;

  const isRunning = status === 'running';
  const isFinished = status === 'finished';
  const isPrimaryControl = !isFinished;
  const runLabel = isRunning ? '暫停' : status === 'paused' ? '繼續' : '開始';

  const [turnAnnounce, setTurnAnnounce] = useState('');
  const [coinStatus, setCoinStatus] = useState('idle');
  const [coinResult, setCoinResult] = useState(null);
  const [selectedFirstPlayer, setSelectedFirstPlayer] = useState(null);
  const prevActiveRef = useRef(activePlayer);
  const coinTimerRef = useRef(0);

  const canFlipCoin = status === 'idle' && coinStatus !== 'flipping';
  const canChooseTurnOrder = status === 'idle' && coinStatus === 'done';
  const coinResultLabel = coinResult ? COIN_FACE_BY_RESULT[coinResult].label : '正面';
  const playerATurnOrderLabel = getPlayerATurnOrderLabel(activePlayer, selectedFirstPlayer);
  const isCoinSetupCollapsed = selectedFirstPlayer !== null;

  useEffect(() => {
    if (!isRunning) return;
    if (prevActiveRef.current !== activePlayer) {
      setTurnAnnounce(`輪到玩家 ${activePlayer}`);
      prevActiveRef.current = activePlayer;
    }
  }, [activePlayer, isRunning]);

  useEffect(() => () => clearTimeout(coinTimerRef.current), []);

  const handleFlipCoin = () => {
    if (!canFlipCoin) return;

    const nextResult = getRandomCoinResult();
    clearTimeout(coinTimerRef.current);
    setCoinStatus('flipping');
    setCoinResult(nextResult);
    setSelectedFirstPlayer(null);

    coinTimerRef.current = window.setTimeout(() => {
      setCoinStatus('done');
    }, COIN_FLIP_MS);
  };

  const handleChoosePlayerATurnOrder = (playerAGoesFirst) => {
    if (!canChooseTurnOrder) return;

    const firstPlayer = playerAGoesFirst ? 'A' : 'B';
    setStartingPlayer(firstPlayer);
    setSelectedFirstPlayer(firstPlayer);
  };

  const handleReopenCoinSetup = () => {
    if (status !== 'idle') return;
    setSelectedFirstPlayer(null);
  };

  const handleReset = () => {
    clearTimeout(coinTimerRef.current);
    setCoinStatus('idle');
    setCoinResult(null);
    setSelectedFirstPlayer(null);
    reset();
  };

  return (
    <section className="clock-page" aria-label="對局計時器">
      <p className="clock-sr-only" aria-live="polite" aria-atomic="true">
        {turnAnnounce}
      </p>

      <header className="clock-page__header">
        <h2 className="clock-page__title">對局計時器</h2>
        <p className="clock-page__hint">
          每方 {INITIAL_MINUTES} 分鐘 · 點擊目前玩家區塊結束回合
        </p>
      </header>

      <section
        className={`clock-coin-panel ${isCoinSetupCollapsed ? 'clock-coin-panel--collapsed' : ''}`}
        aria-labelledby="clock-coin-title"
      >
        {isCoinSetupCollapsed ? (
          <>
            <span id="clock-coin-title" className="clock-sr-only">
              擲硬幣設定結果
            </span>
            <span
              className={[
                'clock-coin',
                'clock-coin--mini',
                coinResult === 'tails' ? 'clock-coin--tails' : 'clock-coin--heads',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            >
              <span className="clock-coin__face clock-coin__face--heads">
                <span className="clock-coin__mark">正</span>
              </span>
              <span className="clock-coin__face clock-coin__face--tails">
                <span className="clock-coin__mark">反</span>
              </span>
            </span>

            <p className="clock-coin-panel__summary" role="status">
              <span className="clock-coin-panel__summary-result">擲出{coinResultLabel}</span>
              <span className="clock-coin-panel__summary-order">{playerATurnOrderLabel}</span>
            </p>

            {status === 'idle' && (
              <button type="button" className="clock-coin-panel__reselect" onClick={handleReopenCoinSetup}>
                重選
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              className="clock-coin-flip"
              onClick={handleFlipCoin}
              disabled={!canFlipCoin}
              aria-describedby="clock-coin-status"
            >
              <span
                className={[
                  'clock-coin',
                  coinStatus === 'flipping' ? 'clock-coin--flipping' : '',
                  coinResult === 'tails' ? 'clock-coin--tails' : 'clock-coin--heads',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden
              >
                <span className="clock-coin__face clock-coin__face--heads">
                  <span className="clock-coin__mark">正</span>
                </span>
                <span className="clock-coin__face clock-coin__face--tails">
                  <span className="clock-coin__mark">反</span>
                </span>
              </span>
              <span className="clock-coin-flip__label">
                {coinStatus === 'flipping' ? '擲硬幣中…' : '擲硬幣'}
              </span>
            </button>

            <div className="clock-coin-panel__main">
              <div className="clock-coin-panel__header">
                <span className="clock-coin-panel__icon" aria-hidden>
                  <Coins strokeWidth={2.25} />
                </span>
                <div>
                  <h3 id="clock-coin-title" className="clock-coin-panel__title">
                    擲硬幣決定先後手
                  </h3>
                  <p className="clock-coin-panel__rule">規則：擲硬幣贏的人可以選擇先手或後手。</p>
                </div>
              </div>

              <div className="clock-coin-panel__content">
                <p id="clock-coin-status" className="clock-coin-panel__status" role="status">
                  {coinStatus === 'flipping'
                    ? '硬幣旋轉中…'
                    : coinStatus === 'done'
                      ? `擲出${coinResultLabel}。請設定玩家 A 先手或後手。`
                      : '擲出正反面後，由贏家選擇玩家 A 的先後手。'}
                </p>

                <div className="clock-coin-panel__choices" aria-label="設定玩家 A 先後手">
                  <button
                    type="button"
                    className="clock-choice-btn"
                    onClick={() => handleChoosePlayerATurnOrder(true)}
                    disabled={!canChooseTurnOrder}
                  >
                    玩家 A 先手
                  </button>
                  <button
                    type="button"
                    className="clock-choice-btn"
                    onClick={() => handleChoosePlayerATurnOrder(false)}
                    disabled={!canChooseTurnOrder}
                  >
                    玩家 A 後手
                  </button>
                </div>

                <p className="clock-coin-panel__selection">
                  {playerATurnOrderLabel}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="clock-page__board">
        <PlayerPanel
          playerId="B"
          label="玩家 B"
          player={playerB}
          isActive={activePlayer === 'B'}
          isRunning={isRunning}
          onEndTurn={endTurn}
        />
        <PlayerPanel
          playerId="A"
          label="玩家 A"
          player={playerA}
          isActive={activePlayer === 'A'}
          isRunning={isRunning}
          onEndTurn={endTurn}
        />
      </div>

      {isFinished && winner && (
        <div className="clock-page__result" role="status">
          玩家 {winner} 獲勝！（對手時間用盡）
        </div>
      )}

      <div className="clock-page__controls">
        <button
          type="button"
          className={`clock-btn ${isPrimaryControl ? 'clock-btn--primary' : ''}`}
          onClick={toggleRun}
          disabled={isFinished || coinStatus === 'flipping'}
        >
          {isRunning ? (
            <span className="clock-btn__content">
              <Pause className="clock-btn__icon" aria-hidden strokeWidth={2.5} />
              暫停
            </span>
          ) : (
            <span className="clock-btn__content">
              <Play className="clock-btn__icon" aria-hidden strokeWidth={2.5} />
              {runLabel}
            </span>
          )}
        </button>
        <button type="button" className="clock-btn" onClick={handleReset}>
          <span className="clock-btn__content">
            <RotateCcw className="clock-btn__icon" aria-hidden strokeWidth={2.25} />
            重設
          </span>
        </button>
      </div>
    </section>
  );
}

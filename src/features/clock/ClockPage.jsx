import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { formatTime, INITIAL_MINUTES } from './clockUtils.js';
import { useGameClock } from './useGameClock.js';
import './ClockPage.css';

const LOW_TIME_MS = 60_000;

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
  const { state, toggleRun, reset, endTurn } = useGameClock();
  const { playerA, playerB, activePlayer, status, winner } = state;

  const isRunning = status === 'running';
  const isFinished = status === 'finished';
  const isPrimaryControl = !isFinished;
  const runLabel = isRunning ? '暫停' : status === 'paused' ? '繼續' : '開始';

  const [turnAnnounce, setTurnAnnounce] = useState('');
  const prevActiveRef = useRef(activePlayer);

  useEffect(() => {
    if (!isRunning) return;
    if (prevActiveRef.current !== activePlayer) {
      setTurnAnnounce(`輪到玩家 ${activePlayer}`);
      prevActiveRef.current = activePlayer;
    }
  }, [activePlayer, isRunning]);

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
          disabled={isFinished}
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
        <button type="button" className="clock-btn" onClick={reset}>
          <span className="clock-btn__content">
            <RotateCcw className="clock-btn__icon" aria-hidden strokeWidth={2.25} />
            重設
          </span>
        </button>
      </div>
    </section>
  );
}

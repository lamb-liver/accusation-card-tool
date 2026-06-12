import { useEffect, useRef, useState } from 'react';
import { Coins, Dices, RotateCcw, Timer } from 'lucide-react';
import './ToolsPage.css';

const COIN_FLIP_MS = 900;
const TOOL_ITEMS = [
  {
    id: 'coin',
    label: '擲硬幣',
    href: '#/tools/coin',
    Icon: Coins,
    status: 'ready',
  },
  {
    id: 'dice',
    label: '擲骰子',
    href: '#/tools/dice',
    Icon: Dices,
    status: 'next',
  },
  {
    id: 'timer',
    label: '棋鐘',
    href: '#/clock',
    Icon: Timer,
    status: 'existing',
  },
];

function randomCoinFace() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % 2 === 0 ? 'heads' : 'tails';
  }
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

function ToolNav({ activeTool = 'coin' }) {
  return (
    <nav className="tools-nav" aria-label="對局工具">
      {TOOL_ITEMS.map(({ id, label, href, Icon, status }) => {
        const isActive = activeTool === id || (id === 'timer' && activeTool === 'timer');
        return (
          <a
            key={id}
            href={href}
            className={`tools-nav__item ${isActive ? 'tools-nav__item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon aria-hidden className="tools-nav__icon" strokeWidth={2.25} />
            <span>{label}</span>
            {status !== 'ready' && (
              <span className="tools-nav__status">
                {status === 'existing' ? '已可用' : '下一步'}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}

function CoinTool() {
  const [face, setFace] = useState('heads');
  const [status, setStatus] = useState('idle');
  const [flipCount, setFlipCount] = useState(0);
  const timerRef = useRef(0);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const isFlipping = status === 'flipping';
  const faceLabel = face === 'heads' ? '正面' : '反面';

  const flip = () => {
    if (isFlipping) return;

    window.clearTimeout(timerRef.current);
    const nextFace = randomCoinFace();
    setStatus('flipping');
    setFace(nextFace);

    timerRef.current = window.setTimeout(() => {
      setStatus('done');
      setFlipCount((count) => count + 1);
    }, COIN_FLIP_MS);
  };

  const reset = () => {
    window.clearTimeout(timerRef.current);
    setFace('heads');
    setStatus('idle');
    setFlipCount(0);
  };

  return (
    <section className="coin-tool" aria-labelledby="coin-tool-title">
      <div className="coin-tool__main">
        <div
          className={[
            'coin-tool__coin',
            face === 'tails' ? 'coin-tool__coin--tails' : 'coin-tool__coin--heads',
            isFlipping ? 'coin-tool__coin--flipping' : '',
          ].filter(Boolean).join(' ')}
          aria-hidden
        >
          <span className="coin-tool__face coin-tool__face--heads">正</span>
          <span className="coin-tool__face coin-tool__face--tails">反</span>
        </div>

        <div className="coin-tool__result" role="status" aria-live="polite">
          <h2 id="coin-tool-title">擲硬幣</h2>
          <p>{isFlipping ? '硬幣旋轉中...' : status === 'done' ? `結果：${faceLabel}` : '點擊按鈕擲出正反面。'}</p>
          <span>次數 {flipCount}</span>
        </div>
      </div>

      <div className="coin-tool__actions">
        <button type="button" className="tool-action tool-action--primary" onClick={flip} disabled={isFlipping}>
          <Coins aria-hidden className="tool-action__icon" strokeWidth={2.5} />
          {isFlipping ? '擲硬幣中' : '擲硬幣'}
        </button>
        <button type="button" className="tool-action" onClick={reset} disabled={isFlipping && flipCount === 0}>
          <RotateCcw aria-hidden className="tool-action__icon" strokeWidth={2.25} />
          重置
        </button>
      </div>
    </section>
  );
}

function PlaceholderTool({ activeTool }) {
  const isDice = activeTool === 'dice';
  return (
    <section className="tools-placeholder" aria-labelledby="tools-placeholder-title">
      <h2 id="tools-placeholder-title">{isDice ? '擲骰子' : '棋鐘'}</h2>
      <p>
        {isDice
          ? '擲骰子會在下一步加入；本階段先用擲硬幣驗證工具殼層。'
          : '棋鐘已保留在既有 #/clock 路由，後續再整合進工具殼層。'}
      </p>
      <a className="tools-placeholder__link" href={isDice ? '#/tools/coin' : '#/clock'}>
        {isDice ? '回到擲硬幣' : '前往既有棋鐘'}
      </a>
    </section>
  );
}

export default function ToolsPage({ activeTool = 'coin' }) {
  const safeTool = activeTool === 'dice' || activeTool === 'timer' ? activeTool : 'coin';

  return (
    <section className="tools-page" aria-label="對局工具區">
      <header className="tools-page__header">
        <p className="tools-page__eyebrow">對局工具</p>
        <h2>快速處理開局與桌邊狀態</h2>
      </header>

      <ToolNav activeTool={safeTool} />

      {safeTool === 'coin' ? <CoinTool /> : <PlaceholderTool activeTool={safeTool} />}
    </section>
  );
}

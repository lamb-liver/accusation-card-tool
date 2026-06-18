import {
  runDeckLayoutInvariantChecks,
  describeElement,
} from './layoutInvariantChecks.js';

const OVERLAY_ID = 'layout-invariant-overlay';
const STYLE_ID = 'layout-invariant-styles';
const OFFENDER_CLASS = 'layout-invariant-offender';

let highlighted = new Set();

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: 2147483646;
      max-height: 40vh;
      overflow: auto;
      padding: 12px 14px;
      border: 2px solid #ff5555;
      border-radius: 10px;
      background: rgba(24, 8, 8, 0.94);
      color: #ffe0e0;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
      pointer-events: auto;
    }
    #${OVERLAY_ID} h2 {
      margin: 0 0 8px;
      font: 600 13px/1.2 system-ui, sans-serif;
      color: #ff8888;
    }
    #${OVERLAY_ID} ul {
      margin: 0;
      padding-left: 1.1rem;
    }
    #${OVERLAY_ID} li { margin-bottom: 6px; }
    #${OVERLAY_ID} button {
      margin-top: 8px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #aa4444;
      background: #331111;
      color: #ffcccc;
      cursor: pointer;
      font: inherit;
    }
    .${OFFENDER_CLASS} {
      outline: 3px solid #ff4444 !important;
      outline-offset: 2px !important;
      box-shadow: 0 0 0 6px rgba(255, 68, 68, 0.25) !important;
    }
  `;
  document.head.appendChild(style);
}

function clearHighlights() {
  for (const el of highlighted) {
    el.classList.remove(OFFENDER_CLASS);
    el.removeAttribute('data-layout-invariant-offender');
  }
  highlighted.clear();
}

function highlightElements(elements) {
  for (const el of elements) {
    if (!(el instanceof Element)) continue;
    el.classList.add(OFFENDER_CLASS);
    el.setAttribute('data-layout-invariant-offender', 'true');
    highlighted.add(el);
    el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderOverlay(violations) {
  ensureStyles();
  let overlay = document.getElementById(OVERLAY_ID);

  if (violations.length === 0) {
    overlay?.remove();
    return;
  }

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'alert');
    document.body.appendChild(overlay);
  }

  const title = document.createElement('h2');
  title.textContent = 'Layout invariant 違規（dev only）';

  const list = document.createElement('ul');
  for (const v of violations) {
    const targets = v.elements.map((el) => describeElement(el)).join(', ') || '(無法定位節點)';
    const item = document.createElement('li');
    const id = document.createElement('strong');
    const target = document.createElement('span');
    id.textContent = v.id;
    target.style.opacity = '0.85';
    target.textContent = `→ ${targets}`;
    item.append(id, ` — ${v.message}`, document.createElement('br'), target);
    list.appendChild(item);
  }

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.textContent = '暫時隱藏';
  dismissButton.dataset.layoutInvariantDismiss = '';

  overlay.replaceChildren(title, list, dismissButton);

  dismissButton.addEventListener(
    'click',
    () => {
      overlay.remove();
      clearHighlights();
    },
    { once: true },
  );
}

function reportViolations(violations) {
  clearHighlights();
  const allOffenders = violations.flatMap((v) => v.elements);
  highlightElements(allOffenders);
  renderOverlay(violations);

  for (const v of violations) {
    console.warn(`[layout-invariant] ${v.id}: ${v.message}`, v.elements);
  }
}

function runCheck() {
  if (!document.querySelector('.deck-builder-container')) {
    clearHighlights();
    document.getElementById(OVERLAY_ID)?.remove();
    return;
  }

  const violations = runDeckLayoutInvariantChecks();
  reportViolations(violations);
}

export function startLayoutInvariantMonitor() {
  ensureStyles();

  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      runCheck();
    });
  };

  schedule();

  const ro = new ResizeObserver(schedule);
  const shell = document.querySelector('.app-shell');
  const deck = document.querySelector('.deck-builder-container');
  if (shell) ro.observe(shell);
  if (deck) ro.observe(deck);

  window.addEventListener('resize', schedule, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('resize', schedule);
    clearHighlights();
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
  };
}

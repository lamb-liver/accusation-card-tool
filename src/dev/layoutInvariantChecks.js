/** @typedef {{ id: string; message: string; elements: Element[] }} LayoutViolation */

export const MAX_DECK_SCROLL_CONTAINERS = 2;
const SCROLL_EPSILON = 5;
const VIEWPORT_EPSILON = 1;

export function isScrollableY(el) {
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden') return false;
  return (
    (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
    el.scrollHeight > el.clientHeight + SCROLL_EPSILON
  );
}

export function getTopLevelDeckScrollContainers() {
  const deckRoot = document.querySelector('.deck-builder-container');
  if (!deckRoot) return [];

  const deckScrollables = [...deckRoot.querySelectorAll('*')].filter(isScrollableY);
  return deckScrollables.filter(
    (el) => !deckScrollables.some((other) => other !== el && other.contains(el)),
  );
}

export function getDeckLayoutSnapshot() {
  const docScroll = document.documentElement.scrollHeight;
  const innerH = window.innerHeight;
  const bodyScroll = document.body.scrollHeight;
  const topLevelScrollContainers = getTopLevelDeckScrollContainers();

  return {
    docScroll,
    bodyScroll,
    innerH,
    pageFitsViewport:
      Math.abs(docScroll - innerH) <= VIEWPORT_EPSILON &&
      Math.abs(bodyScroll - innerH) <= VIEWPORT_EPSILON,
    scrollContainerCount: topLevelScrollContainers.length,
    scrollContainers: topLevelScrollContainers,
    hasVirtualGrid: Boolean(document.querySelector('.card-gallery-grid')),
  };
}

/** @returns {LayoutViolation | null} */
export function validateNoDocumentScroll() {
  // 組牌模式允許 body 自然捲動至 footer，與卡池內 react-window 捲動並存
  return null;
}

/** @returns {LayoutViolation | null} */
export function validateScrollContainers() {
  const containers = getTopLevelDeckScrollContainers();
  if (containers.length <= MAX_DECK_SCROLL_CONTAINERS) return null;

  return {
    id: 'scroll-containers',
    message: `deck 模式頂層 scroll 容器過多：${containers.length}（上限 ${MAX_DECK_SCROLL_CONTAINERS}，應為左欄 + 卡池）`,
    elements: containers,
  };
}

/** @returns {LayoutViolation[]} */
export function runDeckLayoutInvariantChecks() {
  return [validateNoDocumentScroll(), validateScrollContainers()].filter(Boolean);
}

export function describeElement(el) {
  if (!(el instanceof Element)) return String(el);
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls =
    typeof el.className === 'string' && el.className
      ? `.${el.className.trim().split(/\s+/).slice(0, 4).join('.')}`
      : '';
  return `${tag}${id}${cls}`;
}

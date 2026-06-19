/**
 * Runs in the browser via page.evaluate(collectDeckLayoutMetrics).
 * Keep self-contained — Playwright cannot serialize cross-module imports.
 */
export function collectDeckLayoutMetrics() {
  const docScroll = document.documentElement.scrollHeight;
  const innerH = window.innerHeight;
  const bodyScroll = document.body.scrollHeight;

  const isScrollableY = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    return (
      (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight + 5
    );
  };

  const deckRoot = document.querySelector('.deck-builder-container');
  const deckScrollables = deckRoot
    ? [...deckRoot.querySelectorAll('*')].filter(isScrollableY)
    : [];

  const topLevelScrollContainers = deckScrollables.filter(
    (el) => !deckScrollables.some((other) => other !== el && other.contains(el)),
  );

  return {
    docScroll,
    bodyScroll,
    innerH,
    pageFitsViewport: Math.abs(docScroll - innerH) <= 1 && Math.abs(bodyScroll - innerH) <= 1,
    scrollContainerCount: topLevelScrollContainers.length,
    scrollContainers: topLevelScrollContainers.map((el) => ({
      tag: el.tagName.toLowerCase(),
      className: el.className?.toString?.().slice(0, 140) || '',
    })),
    hasFooter: Boolean(document.querySelector('footer')),
  };
}

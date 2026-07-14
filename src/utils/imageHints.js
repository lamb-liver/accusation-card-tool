const hinted = new Set();
const idleQueue = new Set();
let idleHandle = null;

function appendLink(rel, src, as = 'image') {
  if (!src || hinted.has(`${rel}:${src}`)) return;
  hinted.add(`${rel}:${src}`);

  const link = document.createElement('link');
  link.rel = rel;
  link.as = as;
  link.href = src;
  document.head.appendChild(link);
}

/** 高優先：首屏 LCP 用，僅 preload 預設尺寸 */
export function preloadImage(src) {
  appendLink('preload', src);
}

/** 低優先 prefetch（單張） */
function prefetchImage(src) {
  appendLink('prefetch', src);
}

function flushIdlePrefetch() {
  idleHandle = null;
  for (const src of idleQueue) {
    prefetchImage(src);
  }
  idleQueue.clear();
}

/**
 * 在瀏覽器空閒時 prefetch，避免與 LCP 搶 bandwidth。
 * 適用：modal 下一張、hover 預熱。
 */
export function schedulePrefetch(src) {
  if (!src) return;
  idleQueue.add(src);

  if (idleHandle != null) return;

  if (typeof requestIdleCallback === 'function') {
    idleHandle = requestIdleCallback(flushIdlePrefetch, { timeout: 2500 });
  } else {
    idleHandle = setTimeout(flushIdlePrefetch, 1200);
  }
}

export function cancelScheduledPrefetch() {
  if (idleHandle == null) return;
  if (typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(idleHandle);
  } else {
    clearTimeout(idleHandle);
  }
  idleHandle = null;
  idleQueue.clear();
}

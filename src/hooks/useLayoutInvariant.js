import { useLayoutEffect } from 'react';

/**
 * Dev-only deck layout guard: warns, overlays, and highlights offending nodes.
 * No-op in production builds.
 *
 * @param {boolean} active — typically `currentMode === 'deck'`
 * @param {unknown[]} deps — re-check when layout-affecting state changes
 */
export function useLayoutInvariant(active, deps = []) {
  useLayoutEffect(() => {
    if (!import.meta.env.DEV || !active) return undefined;

    let cancelled = false;
    let stopMonitor = null;

    import('../dev/layoutInvariantMonitor.js').then((mod) => {
      if (cancelled) return;
      stopMonitor = mod.startLayoutInvariantMonitor();
    });

    return () => {
      cancelled = true;
      stopMonitor?.();
      stopMonitor = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies layout deps
  }, [active, ...deps]);
}

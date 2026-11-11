import { useEffect } from 'react';

/**
 * active 為 true 時要求螢幕保持開啟（Screen Wake Lock API）。
 *
 * - 不支援的瀏覽器、低電量模式或使用者拒絕時安靜略過，不影響計時。
 * - 切到背景時瀏覽器會自動釋放鎖；回到前景且仍在計時就重新要求。
 *
 * @param {boolean} active
 */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return undefined;

    let sentinel = null;
    let cancelled = false;

    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) {
          next.release().catch(() => {});
          return;
        }
        sentinel = next;
      } catch {
        // NotAllowedError 等：不支援或被拒絕，維持一般行為
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel && !sentinel.released) sentinel.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}

import { useState, useCallback, useEffect, useRef } from 'react';

let _id = 0;
export const TOAST_DURATION_MS = 2000;

/**
 * 輕量 Toast 通知系統：同一時間只顯示一則，新訊息取代舊訊息。
 * 同 group 的訊息在顯示期間連續出現時會合併計數（例如「已加入 X（連續 3 張）」）。
 * 回傳 showToast(message, type?, opts?) 與 <ToastList /> 元件所需的 toasts。
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const lastRef = useRef(/** @type {{ group?: string, count: number } | null} */ (null));

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const showToast = useCallback((message, type = 'success', opts = {}) => {
    const group = opts?.group;
    const prev = lastRef.current;
    const count = group && prev && prev.group === group ? prev.count + 1 : 1;
    lastRef.current = { group, count };
    const id = ++_id;
    const shown = count > 1 ? `${message}（連續 ${count} 張）` : message;
    setToasts([{ id, message: shown, type }]);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setToasts([]);
      lastRef.current = null;
      timerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  return { toasts, showToast };
}

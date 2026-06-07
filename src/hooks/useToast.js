import { useState, useCallback, useEffect, useRef } from 'react';

let _id = 0;
const TOAST_DURATION_MS = 2500;

/**
 * 輕量 Toast 通知系統。
 * 回傳 showToast(message, type?) 與 <ToastList /> 元件所需的 toasts。
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(/** @type {Map<number, ReturnType<typeof setTimeout>>} */ (new Map()));

  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
    const timerId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, TOAST_DURATION_MS);
    timersRef.current.set(id, timerId);
  }, []);

  return { toasts, showToast };
}

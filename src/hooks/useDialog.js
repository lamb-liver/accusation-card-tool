import { useState, useCallback, useRef } from 'react';

/**
 * 非阻斷式 confirm / prompt / alert 系統。
 * 回傳 showConfirm / showPrompt / showAlert 及渲染 DialogContainer 所需的 dialogState。
 */
export function useDialog() {
  const [dialogState, setDialogState] = useState(null);
  const resolveRef = useRef(null);

  const openDialog = useCallback((config) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogState(config);
    });
  }, []);

  const resolve = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setDialogState(null);
  }, []);

  /** Confirm：resolve true/false */
  const showConfirm = useCallback(
    (message, { title = '確認', confirmLabel = '確定', cancelLabel = '取消', danger = false } = {}) =>
      openDialog({ type: 'confirm', message, title, confirmLabel, cancelLabel, danger }),
    [openDialog]
  );

  /** Prompt：resolve 輸入字串 或 null（取消） */
  const showPrompt = useCallback(
    (
      message,
      {
        title = '輸入',
        placeholder = '',
        defaultValue = '',
        confirmLabel = '確定',
        cancelLabel = '取消',
        multiline = false,
      } = {},
    ) =>
      openDialog({
        type: 'prompt',
        message,
        title,
        placeholder,
        defaultValue,
        confirmLabel,
        cancelLabel,
        multiline,
      }),
    [openDialog]
  );

  return { dialogState, resolve, showConfirm, showPrompt };
}

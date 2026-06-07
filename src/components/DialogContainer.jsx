import { useState, useEffect, useRef } from 'react';

/**
 * 全域非阻斷 Dialog 容器。
 * 支援 confirm（true/false）與 prompt（string | null）兩種模式。
 * props:
 *   dialogState  — { type, message, title, confirmLabel, cancelLabel, danger?, placeholder?, defaultValue?, multiline? }
 *   resolve      — (value) => void  由 useDialog 提供
 */
export default function DialogContainer({ dialogState, resolve }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!dialogState) return;
    if (dialogState.type === 'prompt') {
      setInputValue(dialogState.defaultValue ?? '');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [dialogState]);

  if (!dialogState) return null;

  const { type, message, title, confirmLabel, cancelLabel, danger, placeholder, multiline } = dialogState;

  const handleConfirm = () => {
    if (type === 'prompt') resolve(inputValue);
    else                   resolve(true);
  };

  const handleCancel = () => {
    if (type === 'prompt') resolve(null);
    else                   resolve(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) handleConfirm();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="fixed inset-0 z-[9800] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-sm rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        onKeyDown={handleKey}
      >
        {/* 標題列 */}
        <div className={`px-5 pt-4 pb-3 border-b ${danger ? 'border-red-800' : 'border-neutral-700'}`}>
          <h3 id="dialog-title" className={`text-base font-bold ${danger ? 'text-red-400' : 'text-brand-gold'}`}>
            {title}
          </h3>
        </div>

        {/* 內容 */}
        <div className="px-5 py-4">
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
          {type === 'prompt' && multiline && (
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={placeholder}
              rows={8}
              className="mt-3 max-h-[45vh] min-h-36 w-full resize-y rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-gold focus:outline-none transition"
            />
          )}
          {type === 'prompt' && !multiline && (
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="mt-3 w-full rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-gold focus:outline-none transition"
            />
          )}
        </div>

        {/* 按鈕列 */}
        <div className="flex gap-2 px-5 pb-5 justify-end">
          <button
            onClick={handleCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold bg-neutral-700 hover:bg-neutral-600 text-gray-200 transition"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={handleConfirm}
            className={`rounded-lg px-5 py-2 text-sm font-bold transition ${
              danger
                ? 'bg-red-700 hover:bg-red-600 text-white'
                : 'bg-brand-gold hover:bg-amber-500 text-neutral-900'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

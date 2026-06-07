import { CheckCircle2, CircleAlert, CircleX, Info } from 'lucide-react';

/**
 * 全域 Toast 容器，顯示在畫面底部中央。
 * type: 'success' | 'error' | 'warning' | 'info'
 */
const TYPE_STYLES = {
  success: 'border-green-500  text-green-300',
  error: 'border-red-500    text-red-300',
  warning: 'border-brand-gold  text-amber-300',
  info: 'border-sky-400    text-sky-300',
};

const TYPE_ICONS = {
  success: CheckCircle2,
  error: CircleX,
  warning: CircleAlert,
  info: Info,
};

export default function ToastList({ toasts = [] }) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
    >
      {toasts.map((t) => {
        const Icon = TYPE_ICONS[t.type] ?? TYPE_ICONS.info;
        return (
          <div
            key={t.id}
            className={`flex max-w-[min(100vw-2rem,28rem)] items-center gap-2 px-5 py-2.5 rounded-full border bg-neutral-900/95 backdrop-blur text-sm font-semibold shadow-lg animate-[fadeUp_0.25s_ease] ${TYPE_STYLES[t.type] ?? TYPE_STYLES.info}`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-95" aria-hidden strokeWidth={2.25} />
            <span className="min-w-0 text-left leading-snug">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

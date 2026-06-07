import { TriangleAlert } from 'lucide-react';

export default function AsyncPanel({
  isLoading = false,
  isRetrying = false,
  isError = false,
  errorMessage = '載入失敗',
  onRetry,
  isEmpty = false,
  emptyIcon: EmptyIcon,
  emptyTitle = '尚無資料',
  emptyHint = '',
  children,
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center text-gray-400" aria-busy="true">
        載入中…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-lg border border-red-500/60 bg-red-950/40 px-6 py-8 text-center text-red-300"
        role="alert"
      >
        <TriangleAlert className="h-8 w-8 shrink-0" aria-hidden strokeWidth={2.25} />
        <p>{errorMessage}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isRetrying}
            className="rounded border border-red-400 px-4 py-2 text-sm transition hover:bg-red-500/20 disabled:opacity-50"
          >
            {isRetrying ? '重新載入中…' : '重新載入'}
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <div className="max-w-md rounded-lg border-4 border-dashed border-brand-gold/30 p-12 text-center">
          {EmptyIcon && (
            <EmptyIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" aria-hidden strokeWidth={2} />
          )}
          <p className="text-lg font-medium text-gray-400">{emptyTitle}</p>
          {emptyHint && <p className="mt-2 text-sm text-gray-500">{emptyHint}</p>}
        </div>
      </div>
    );
  }

  return children;
}

function LoadMoreButton({ hasMore, isLoading, onClick, label }) {
  if (!hasMore) return null;
  return (
    <div className="mt-4 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="rounded border border-[#555] px-4 py-2 text-sm text-gray-300 transition hover:border-brand-gold disabled:opacity-50"
      >
        {isLoading ? '載入中…' : label}
      </button>
    </div>
  );
}

export { LoadMoreButton };

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * 對齊舊版 script.js：renderPagination / changePage / setPerPage（perPage 0 = 顯示全部）
 */
export default function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  totalCards = 0,
  perPage = 0,
  isPaginationMode = false,
  onPageChange = () => {},
  onPerPageChange = () => {},
}) {
  if (totalCards === 0) return null;

  return (
    <div className="flex justify-center items-center gap-1.5 flex-wrap my-5">
      {isPaginationMode && (
        <>
          <button
            type="button"
            aria-label="上一頁"
            className="inline-flex items-center justify-center px-3 py-1.5 bg-neutral-800 border border-neutral-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden strokeWidth={2.25} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              className={`px-3 py-1.5 border rounded text-sm min-w-[2.25rem] ${
                pageNum === currentPage
                  ? 'bg-brand-gold text-neutral-900 border-brand-gold font-semibold'
                  : 'bg-neutral-800 border-neutral-600 text-white hover:bg-neutral-700'
              }`}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          ))}

          <button
            type="button"
            aria-label="下一頁"
            className="inline-flex items-center justify-center px-3 py-1.5 bg-neutral-800 border border-neutral-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden strokeWidth={2.25} />
          </button>
        </>
      )}

      <select
        aria-label="每頁顯示數量"
        className="px-3 py-1.5 bg-neutral-800 border border-neutral-600 text-white rounded text-sm ml-1"
        value={perPage}
        onChange={(e) => onPerPageChange(Number(e.target.value))}
      >
        <option value={12}>12張/頁</option>
        <option value={24}>24張/頁</option>
        <option value={48}>48張/頁</option>
        <option value={0}>顯示全部</option>
      </select>
    </div>
  );
}

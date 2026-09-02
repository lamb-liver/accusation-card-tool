import { ClipboardList, FileJson, ImageDown, Share2, Upload } from 'lucide-react';

const menuItemClass =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#3a3a3a]';

function closeDetails(event) {
  event.currentTarget.closest('details')?.removeAttribute('open');
}

export function DeckExportMenu({ onExportText, onExportJson, onExportImage }) {
  return (
    <details className="deck-export-menu relative">
      <summary
        aria-label="匯出牌組"
        className="cursor-pointer list-none rounded border border-brand-gold/60 px-2.5 py-1 text-xs font-semibold text-brand-gold hover:bg-brand-gold/10 [&::-webkit-details-marker]:hidden"
      >
        匯出
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded border border-[#444] bg-[#2a2a2a] py-1 shadow-lg">
        <button type="button" className={menuItemClass} onClick={(event) => { closeDetails(event); onExportText(); }}>
          <ClipboardList className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
          複製清單
        </button>
        <button type="button" className={menuItemClass} onClick={(event) => { closeDetails(event); onExportJson(); }}>
          <FileJson className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
          下載 JSON
        </button>
        <button type="button" className={menuItemClass} onClick={(event) => { closeDetails(event); onExportImage(); }}>
          <ImageDown className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
          匯出圖片
        </button>
      </div>
    </details>
  );
}

export default function DeckTransferActions({
  onImportDeck,
  onSubmitToShareWall,
}) {
  return (
    <div className="deck-action-buttons border-t border-[#444] pt-3 space-y-2">
      <button
        type="button"
        onClick={onImportDeck}
        className="btn-import-deck inline-flex w-full items-center justify-center gap-2 bg-[#6c757d] hover:bg-[#7d868d] text-white font-semibold py-2 px-3 rounded text-sm transition"
      >
        <Upload className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
        匯入牌組
      </button>
      {onSubmitToShareWall && (
        <button
          type="button"
          onClick={onSubmitToShareWall}
          className="inline-flex w-full items-center justify-center gap-2 bg-emerald-700 py-2 px-3 rounded text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          <Share2 className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
          投稿到分享牆
        </button>
      )}
    </div>
  );
}

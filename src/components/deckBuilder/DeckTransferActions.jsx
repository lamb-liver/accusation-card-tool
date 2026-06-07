import { ClipboardList, FileJson, ImageDown, Share2, Upload } from 'lucide-react';

export default function DeckTransferActions({
  onExportText,
  onExportJson,
  onExportImage,
  onImportDeck,
  onSubmitToShareWall,
}) {
  return (
    <div className="deck-action-buttons border-t border-[#444] pt-3 space-y-2">
      <button
        type="button"
        onClick={onExportText}
        className="btn-export-deck inline-flex w-full items-center justify-center gap-2 bg-[#2b5797] hover:bg-[#3a6db3] text-white font-semibold py-2 px-3 rounded text-sm transition"
      >
        <ClipboardList className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
        複製牌組清單
      </button>
      <button
        type="button"
        onClick={onExportJson}
        className="btn-export-deck inline-flex w-full items-center justify-center gap-2 bg-[#2b5797] hover:bg-[#3a6db3] text-white font-semibold py-2 px-3 rounded text-sm transition"
      >
        <FileJson className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
        匯出備份(JSON)
      </button>
      <button
        type="button"
        onClick={onExportImage}
        className="btn-export-image inline-flex w-full items-center justify-center gap-2 bg-[#9b59b6] hover:bg-[#aa6ac9] text-white font-semibold py-2 px-3 rounded text-sm transition"
      >
        <ImageDown className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
        匯出牌組圖片
      </button>
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

import { useState } from 'react';

export default function DeckManagerSection({
  savedDecks,
  onSaveDeck,
  onLoadDeck,
  onDeleteDeck,
}) {
  const [deckNameInput, setDeckNameInput] = useState('');

  const handleSave = () => {
    onSaveDeck(deckNameInput);
    setDeckNameInput('');
  };

  return (
    <div className="deck-manager border-t border-[#444] pt-3 flex flex-col gap-2">
      <h3 className="text-brand-gold font-semibold text-sm">牌組管理</h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={deckNameInput}
          onChange={(event) => setDeckNameInput(event.target.value)}
          onKeyDown={(event) => {
            // 輸入法組字中的 Enter（選字確認）不應觸發儲存；keyCode 229 為舊版瀏覽器的組字訊號
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === 'Enter') handleSave();
          }}
          placeholder="牌組名稱（最多 20 字）"
          maxLength={20}
          className="flex-1 bg-[#2a2a2a] border border-[#444] text-white p-2 rounded text-sm focus:border-brand-gold focus:outline-none transition"
        />
        <button
          type="button"
          onClick={handleSave}
          className="shrink-0 bg-brand-gold hover:brightness-110 active:brightness-90 text-black font-bold py-2 px-3 rounded text-sm transition"
        >
          儲存
        </button>
      </div>

      {savedDecks.length > 0 ? (
        <ul className="flex flex-col gap-1 max-h-44 overflow-y-auto">
          {savedDecks.map((saved) => (
            <li
              key={saved.name}
              className="flex items-center gap-1 bg-[#2a2a2a] rounded px-2 py-1.5 text-xs"
            >
              <span className="flex-1 truncate text-gray-200 font-medium">{saved.name}</span>
              <button
                type="button"
                onClick={() => onLoadDeck(saved.name)}
                className="shrink-0 px-2 py-0.5 rounded bg-[#2b5797] hover:bg-[#3a6db3] text-white transition"
              >
                載入
              </button>
              <button
                type="button"
                onClick={() => onDeleteDeck(saved.name)}
                className="shrink-0 px-2 py-0.5 rounded bg-[#8b0000] hover:bg-[#a50000] text-white transition"
              >
                刪除
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 text-xs text-center py-1">尚無儲存的牌組</p>
      )}
    </div>
  );
}

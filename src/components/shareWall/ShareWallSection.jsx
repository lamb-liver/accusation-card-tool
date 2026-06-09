import { LayoutGrid } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchPublicDecks, PUBLIC_PAGE_SIZE } from '../../api/shareWallApi.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { formatShareWallError } from '../../utils/formatShareWallError.js';
import { formatApiDate } from '../../utils/formatApiDate.js';
import AsyncPanel, { LoadMoreButton } from '../common/AsyncPanel.jsx';

export default function ShareWallSection({
  onOpenDeck,
  embedded = false,
  loadEnabled = true,
}) {
  const loadDecks = useCallback(() => fetchPublicDecks({ limit: PUBLIC_PAGE_SIZE, offset: 0 }), []);
  const { data, isLoading, isRetrying, isError, errorMessage, reload } = useAsyncResource(
    loadDecks,
    { enabled: loadEnabled },
  );

  const [decks, setDecks] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');

  useEffect(() => {
    if (!data) return;
    setDecks(data.decks ?? []);
    setHasMore(data.hasMore ?? false);
    setOffset((data.decks ?? []).length);
    setLoadMoreError('');
  }, [data]);

  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setLoadMoreError('');
    try {
      const next = await fetchPublicDecks({ limit: PUBLIC_PAGE_SIZE, offset });
      setDecks((prev) => [...prev, ...(next.decks ?? [])]);
      setHasMore(next.hasMore ?? false);
      setOffset((prev) => prev + (next.decks ?? []).length);
    } catch (error) {
      setLoadMoreError(formatShareWallError(error, '載入更多失敗'));
    } finally {
      setIsLoadingMore(false);
    }
  }

  const listPanel = embedded && !loadEnabled ? (
    <div
      className="flex min-h-52 items-center justify-center rounded-lg bg-neutral-800/50 text-sm text-gray-500"
      aria-hidden
    >
      準備載入牌組…
    </div>
  ) : (
    <AsyncPanel
      isLoading={isLoading}
      isRetrying={isRetrying}
      isError={isError}
      errorMessage={errorMessage}
      onRetry={reload}
      isEmpty={decks.length === 0}
      emptyIcon={LayoutGrid}
      emptyTitle="尚無公開牌組"
      emptyHint="歡迎在組牌模式投稿，等待審核通過後會顯示於此"
      loadingMinHeight="min-h-52"
    >
      <ul className="space-y-3">
        {decks.map((deck) => (
          <li key={deck.share_id}>
            <button
              type="button"
              onClick={() => onOpenDeck(deck.share_id)}
              className="w-full rounded-lg border-2 border-[#444] bg-[#252525] p-4 text-left transition hover:border-brand-gold"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-brand-gold">{deck.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">作者：{deck.author_name}</p>
                  {deck.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-300">{deck.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-gray-500">
                  <div>最後核准</div>
                  <div>{formatApiDate(deck.reviewed_at)}</div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {loadMoreError && (
        <p className="mt-4 text-center text-sm text-red-400" role="alert">
          {loadMoreError}
        </p>
      )}
      <LoadMoreButton
        hasMore={hasMore}
        isLoading={isLoadingMore}
        onClick={handleLoadMore}
        label="載入更多牌組"
      />
    </AsyncPanel>
  );

  return (
    <section className={embedded ? undefined : 'mx-auto max-w-3xl'}>
      {embedded ? (
        <header className="mb-6 text-center">
          <h3 className="text-lg font-bold text-brand-gold">分享牌組</h3>
          <p className="mt-1 text-sm text-gray-400">已核准的牌組，依最後核准時間排序</p>
        </header>
      ) : (
        <header className="mb-6 text-center">
          <h2 className="text-xl font-bold text-brand-gold">分享牆</h2>
          <p className="mt-1 text-sm text-gray-400">已核准的牌組，依最後核准時間排序</p>
        </header>
      )}

      {listPanel}
    </section>
  );
}

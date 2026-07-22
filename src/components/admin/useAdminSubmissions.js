import { useCallback, useEffect, useState } from 'react';
import { ADMIN_PAGE_SIZE, fetchAdminSubmissions } from '../../api/shareWallApi.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { formatShareWallError } from '../../utils/formatShareWallError.js';

const EMPTY_SUBMISSIONS = {
  decks: [],
  messages: [],
  decksHasMore: false,
  messagesHasMore: false,
};

/**
 * 審核動作後就地更新列表。
 *
 * 取代整份 reload：reload 會把已按「載入更多」取得的項目全部丟掉、回到
 * 第一頁，審核多筆時每按一次就得重新往下捲。
 *
 * - statusFilter 為 'all'：項目仍屬於結果集，只換 status。
 * - 篩選特定狀態：項目已不符條件而移除。伺服器端的結果集同樣少一筆，
 *   故呼叫端需把 offset 減 1，下次「載入更多」的 OFFSET 才會對齊。
 *
 * 取捨：不會順帶刷新其他項目的狀態（單人後台場景可接受，必要時仍可手動
 * 重新載入）。
 *
 * @param {Array<{ id: number, status: string }>} items
 * @param {{ id: number, nextStatus: string, statusFilter: string }} change
 * @returns {{ items: Array<object>, removed: boolean }}
 */
export function applyStatusChangeToList(items, { id, nextStatus, statusFilter }) {
  if (statusFilter === 'all') {
    return {
      items: items.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)),
      removed: false,
    };
  }

  const nextItems = items.filter((item) => item.id !== id);
  return { items: nextItems, removed: nextItems.length !== items.length };
}

export function useAdminSubmissions({ authState, typeFilter, statusFilter }) {
  const [decks, setDecks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [decksHasMore, setDecksHasMore] = useState(false);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [deckOffset, setDeckOffset] = useState(0);
  const [messageOffset, setMessageOffset] = useState(0);
  const [isLoadingMoreDecks, setIsLoadingMoreDecks] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [loadMoreDecksError, setLoadMoreDecksError] = useState('');
  const [loadMoreMessagesError, setLoadMoreMessagesError] = useState('');

  const loader = useCallback(async () => {
    if (authState !== true) return EMPTY_SUBMISSIONS;
    return fetchAdminSubmissions({
      type: typeFilter,
      status: statusFilter,
      limit: ADMIN_PAGE_SIZE,
      offset: 0,
    });
  }, [authState, typeFilter, statusFilter]);

  const { data, isLoading, isRetrying, isError, errorMessage, reload } =
    useAsyncResource(loader);

  useEffect(() => {
    if (!data) return;
    const nextDecks = data.decks ?? [];
    const nextMessages = data.messages ?? [];
    setDecks(nextDecks);
    setMessages(nextMessages);
    setDecksHasMore(data.decksHasMore ?? false);
    setMessagesHasMore(data.messagesHasMore ?? false);
    setDeckOffset(nextDecks.length);
    setMessageOffset(nextMessages.length);
    setLoadMoreDecksError('');
    setLoadMoreMessagesError('');
  }, [data]);

  const loadMoreSubmissions = useCallback(async (kind) => {
    const isDeck = kind === 'deck';
    const isLoadingMore = isDeck ? isLoadingMoreDecks : isLoadingMoreMessages;
    const hasMore = isDeck ? decksHasMore : messagesHasMore;
    if (isLoadingMore || !hasMore) return;

    const offset = isDeck ? deckOffset : messageOffset;
    const setItems = isDeck ? setDecks : setMessages;
    const setHasMore = isDeck ? setDecksHasMore : setMessagesHasMore;
    const setOffset = isDeck ? setDeckOffset : setMessageOffset;
    const setLoadingMore = isDeck ? setIsLoadingMoreDecks : setIsLoadingMoreMessages;
    const setLoadMoreError = isDeck ? setLoadMoreDecksError : setLoadMoreMessagesError;
    const itemsKey = isDeck ? 'decks' : 'messages';
    const hasMoreKey = isDeck ? 'decksHasMore' : 'messagesHasMore';

    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const next = await fetchAdminSubmissions({
        type: kind,
        status: statusFilter,
        limit: ADMIN_PAGE_SIZE,
        offset,
      });
      const nextItems = next[itemsKey] ?? [];
      setItems((prev) => [...prev, ...nextItems]);
      setHasMore(next[hasMoreKey] ?? false);
      setOffset((prev) => prev + nextItems.length);
    } catch (error) {
      setLoadMoreError(formatShareWallError(error, '載入更多失敗'));
    } finally {
      setLoadingMore(false);
    }
  }, [
    deckOffset,
    decksHasMore,
    isLoadingMoreDecks,
    isLoadingMoreMessages,
    messageOffset,
    messagesHasMore,
    statusFilter,
  ]);

  /**
   * @param {'deck' | 'message'} kind 與 AdminSection 的 runStatusAction 一致
   *   （注意：載入更多用的是 API 的 'guestbook'，此處是留言的 'message'）
   */
  const applyStatusChange = useCallback(
    (kind, id, nextStatus) => {
      const isDeck = kind === 'deck';
      const items = isDeck ? decks : messages;
      const setItems = isDeck ? setDecks : setMessages;
      const setOffset = isDeck ? setDeckOffset : setMessageOffset;

      const { items: nextItems, removed } = applyStatusChangeToList(items, {
        id,
        nextStatus,
        statusFilter,
      });

      setItems(nextItems);
      if (removed) setOffset((prev) => Math.max(0, prev - 1));
    },
    [decks, messages, statusFilter],
  );

  const handleLoadMoreDecks = useCallback(() => loadMoreSubmissions('deck'), [loadMoreSubmissions]);
  const handleLoadMoreMessages = useCallback(
    () => loadMoreSubmissions('guestbook'),
    [loadMoreSubmissions],
  );

  return {
    decks,
    messages,
    decksHasMore,
    messagesHasMore,
    isLoading,
    isRetrying,
    isError,
    errorMessage,
    reload,
    applyStatusChange,
    isLoadingMoreDecks,
    isLoadingMoreMessages,
    loadMoreDecksError,
    loadMoreMessagesError,
    handleLoadMoreDecks,
    handleLoadMoreMessages,
  };
}

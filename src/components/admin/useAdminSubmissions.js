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
 * - 篩選特定狀態：項目已不符條件而移除。
 *
 * 游標不需要跟著調整：keyset 以「上一頁最後一筆的排序鍵」定位，不受前面
 * 筆數變動影響——這正是改用 cursor 分頁要解決的問題。（OFFSET 時期則必須
 * 把 offset 減 1 才能對齊。）
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
  const [deckCursor, setDeckCursor] = useState(null);
  const [messageCursor, setMessageCursor] = useState(null);
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
    setDeckCursor(data.decksNextCursor ?? null);
    setMessageCursor(data.messagesNextCursor ?? null);
    setLoadMoreDecksError('');
    setLoadMoreMessagesError('');
  }, [data]);

  const loadMoreSubmissions = useCallback(async (kind) => {
    const isDeck = kind === 'deck';
    const isLoadingMore = isDeck ? isLoadingMoreDecks : isLoadingMoreMessages;
    const hasMore = isDeck ? decksHasMore : messagesHasMore;
    const cursor = isDeck ? deckCursor : messageCursor;
    // 沒有游標就沒有下一頁；缺少它時不可退回第一頁，否則會重複附加既有項目
    if (isLoadingMore || !hasMore || !cursor) return;

    const setItems = isDeck ? setDecks : setMessages;
    const setHasMore = isDeck ? setDecksHasMore : setMessagesHasMore;
    const setCursor = isDeck ? setDeckCursor : setMessageCursor;
    const setLoadingMore = isDeck ? setIsLoadingMoreDecks : setIsLoadingMoreMessages;
    const setLoadMoreError = isDeck ? setLoadMoreDecksError : setLoadMoreMessagesError;
    const itemsKey = isDeck ? 'decks' : 'messages';
    const hasMoreKey = isDeck ? 'decksHasMore' : 'messagesHasMore';
    const cursorKey = isDeck ? 'decksNextCursor' : 'messagesNextCursor';

    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const next = await fetchAdminSubmissions({
        type: kind,
        status: statusFilter,
        limit: ADMIN_PAGE_SIZE,
        ...(isDeck ? { deckCursor: cursor } : { messageCursor: cursor }),
      });
      const nextItems = next[itemsKey] ?? [];
      setItems((prev) => [...prev, ...nextItems]);
      setHasMore(next[hasMoreKey] ?? false);
      setCursor(next[cursorKey] ?? null);
    } catch (error) {
      setLoadMoreError(formatShareWallError(error, '載入更多失敗'));
    } finally {
      setLoadingMore(false);
    }
  }, [
    deckCursor,
    decksHasMore,
    isLoadingMoreDecks,
    isLoadingMoreMessages,
    messageCursor,
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

      // 游標不必調整（見 applyStatusChangeToList 的說明）
      const { items: nextItems } = applyStatusChangeToList(items, {
        id,
        nextStatus,
        statusFilter,
      });

      setItems(nextItems);
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

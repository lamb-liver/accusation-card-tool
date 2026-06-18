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
    isLoadingMoreDecks,
    isLoadingMoreMessages,
    loadMoreDecksError,
    loadMoreMessagesError,
    handleLoadMoreDecks,
    handleLoadMoreMessages,
  };
}

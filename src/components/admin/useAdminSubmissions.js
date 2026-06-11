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

  const handleLoadMoreDecks = useCallback(async () => {
    if (isLoadingMoreDecks || !decksHasMore) return;
    setIsLoadingMoreDecks(true);
    setLoadMoreDecksError('');
    try {
      const next = await fetchAdminSubmissions({
        type: 'deck',
        status: statusFilter,
        limit: ADMIN_PAGE_SIZE,
        offset: deckOffset,
      });
      const nextDecks = next.decks ?? [];
      setDecks((prev) => [...prev, ...nextDecks]);
      setDecksHasMore(next.decksHasMore ?? false);
      setDeckOffset((prev) => prev + nextDecks.length);
    } catch (error) {
      setLoadMoreDecksError(formatShareWallError(error, '載入更多失敗'));
    } finally {
      setIsLoadingMoreDecks(false);
    }
  }, [deckOffset, decksHasMore, isLoadingMoreDecks, statusFilter]);

  const handleLoadMoreMessages = useCallback(async () => {
    if (isLoadingMoreMessages || !messagesHasMore) return;
    setIsLoadingMoreMessages(true);
    setLoadMoreMessagesError('');
    try {
      const next = await fetchAdminSubmissions({
        type: 'guestbook',
        status: statusFilter,
        limit: ADMIN_PAGE_SIZE,
        offset: messageOffset,
      });
      const nextMessages = next.messages ?? [];
      setMessages((prev) => [...prev, ...nextMessages]);
      setMessagesHasMore(next.messagesHasMore ?? false);
      setMessageOffset((prev) => prev + nextMessages.length);
    } catch (error) {
      setLoadMoreMessagesError(formatShareWallError(error, '載入更多失敗'));
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [isLoadingMoreMessages, messageOffset, messagesHasMore, statusFilter]);

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

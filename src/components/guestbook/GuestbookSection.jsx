import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import {
  fetchGuestbookMessages,
  PUBLIC_PAGE_SIZE,
  submitGuestbookMessage,
} from '../../api/shareWallApi.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { formatApiDate } from '../../utils/formatApiDate.js';
import { formatShareWallError } from '../../utils/formatShareWallError.js';
import AsyncPanel, { LoadMoreButton } from '../common/AsyncPanel.jsx';
import TurnstileWidget from '../common/TurnstileWidget.jsx';
import { isTurnstileEnabled } from '../../utils/turnstileConfig.js';

export default function GuestbookSection({ showToast, embedded = false }) {
  const loadMessages = useCallback(
    () => fetchGuestbookMessages({ limit: PUBLIC_PAGE_SIZE, offset: 0 }),
    [],
  );
  const { data, isLoading, isRetrying, isError, errorMessage, reload } =
    useAsyncResource(loadMessages);

  const [authorName, setAuthorName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');

  useEffect(() => {
    if (!data) return;
    setMessages(data.messages ?? []);
    setHasMore(data.hasMore ?? false);
    setOffset((data.messages ?? []).length);
    setLoadMoreError('');
  }, [data]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    if (isTurnstileEnabled() && !turnstileToken) {
      showToast('請完成人機驗證', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitGuestbookMessage({
        author_name: authorName.trim(),
        message: message.trim(),
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      });
      setAuthorName('');
      setMessage('');
      setSubmitted(true);
      setTurnstileToken(null);
      setTurnstileReset((key) => key + 1);
      showToast('留言已送出，等待管理員審核', 'success');
    } catch (error) {
      showToast(formatShareWallError(error, '投稿失敗'), 'error');
      setTurnstileReset((key) => key + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setLoadMoreError('');
    try {
      const next = await fetchGuestbookMessages({ limit: PUBLIC_PAGE_SIZE, offset });
      setMessages((prev) => [...prev, ...(next.messages ?? [])]);
      setHasMore(next.hasMore ?? false);
      setOffset((prev) => prev + (next.messages ?? []).length);
    } catch (error) {
      setLoadMoreError(formatShareWallError(error, '載入更多失敗'));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section className={embedded ? 'space-y-8' : 'mx-auto max-w-3xl space-y-8'}>
      {embedded ? (
        <header>
          <h3 className="text-center text-lg font-bold text-brand-gold">留言板</h3>
          <p className="mt-1 text-center text-sm text-gray-400">留言需經審核後才會公開顯示</p>
        </header>
      ) : (
        <header className="text-center">
          <h2 className="text-xl font-bold text-brand-gold">留言板</h2>
          <p className="mt-1 text-sm text-gray-400">留言需經審核後才會公開顯示</p>
        </header>
      )}

      <form
        onSubmit={handleSubmit}
        className="guestbook-form rounded-lg border-2 border-[#444] bg-[#252525] p-4 space-y-3"
      >
        <div>
          <label htmlFor="guestbook-author" className="mb-1 block text-sm text-gray-400">
            名稱（1–24 字）
          </label>
          <input
            id="guestbook-author"
            type="text"
            maxLength={24}
            required
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full rounded border border-[#555] bg-[#222] px-3 py-2 text-white outline-none focus:border-brand-gold"
          />
        </div>
        <div>
          <label htmlFor="guestbook-message" className="mb-1 block text-sm text-gray-400">
            留言（1–300 字）
          </label>
          <textarea
            id="guestbook-message"
            required
            maxLength={300}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-y rounded border border-[#555] bg-[#222] px-3 py-2 text-white outline-none focus:border-brand-gold"
          />
        </div>
        <TurnstileWidget resetKey={turnstileReset} onToken={setTurnstileToken} />
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-brand-gold py-2.5 font-bold text-neutral-900 transition hover:bg-amber-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
          {isSubmitting ? '送出中…' : '送出留言'}
        </button>
        {submitted && (
          <p className="text-center text-sm text-green-400" role="status">
            您的留言已送出，審核通過後會顯示在下方列表。
          </p>
        )}
      </form>

      <div>
        <h3 className="mb-4 text-center font-semibold text-gray-300">公開留言</h3>
        <AsyncPanel
          isLoading={isLoading}
          isRetrying={isRetrying}
          isError={isError}
          errorMessage={errorMessage}
          onRetry={reload}
          isEmpty={messages.length === 0}
          emptyIcon={MessageSquare}
          emptyTitle="尚無公開留言"
          emptyHint="成為第一位留言者吧"
          loadingMinHeight="min-h-52"
        >
          <ul className="space-y-3">
            {messages.map((entry, index) => (
              <li
                key={`${entry.author_name}-${entry.reviewed_at}-${index}`}
                className="guestbook-message-card rounded-lg border border-[#444] bg-[#252525] p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-brand-gold">{entry.author_name}</span>
                  <span className="text-xs text-gray-500">{formatApiDate(entry.reviewed_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-gray-200">{entry.message}</p>
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
            label="載入更多留言"
          />
        </AsyncPanel>
      </div>
    </section>
  );
}

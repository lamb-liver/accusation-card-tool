import { useEffect, useState } from 'react';
import { Eye, Shield } from 'lucide-react';
import {
  adminLogin,
  adminLogout,
  fetchAdminDeck,
  fetchAdminSubmissions,
  patchDeckStatus,
  patchMessageStatus,
  ShareWallApiError,
} from '../../api/shareWallApi.js';
import { formatApiDate } from '../../utils/formatApiDate.js';
import { formatShareWallError } from '../../utils/formatShareWallError.js';
import { cardNamesById } from '../../data/cardNames.generated.js';
import AsyncPanel, { LoadMoreButton } from '../common/AsyncPanel.jsx';
import { useAdminSubmissions } from './useAdminSubmissions.js';

const STATUS_OPTIONS = [
  { id: 'pending', label: '待審核' },
  { id: 'approved', label: '已核准' },
  { id: 'hidden', label: '已隱藏' },
  { id: 'deleted', label: '已刪除' },
  { id: 'all', label: '全部' },
];

const TYPE_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'deck', label: '牌組' },
  { id: 'guestbook', label: '留言' },
];

export default function AdminSection({ showToast, showConfirm }) {
  /** @type {[boolean | null, Function]} */
  const [authState, setAuthState] = useState(null);
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authProbeError, setAuthProbeError] = useState('');
  const [authProbeRetry, setAuthProbeRetry] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actionId, setActionId] = useState(null);

  const [previewDeck, setPreviewDeck] = useState(null);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminSubmissions({ type: 'all', status: 'pending', limit: 1, offset: 0 })
      .then(() => {
        if (!cancelled) {
          setAuthProbeError('');
          setAuthState(true);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ShareWallApiError && error.status === 401) {
          setAuthProbeError('');
          setAuthState(false);
        } else {
          setAuthProbeError(formatShareWallError(error, '無法驗證登入狀態'));
          setAuthState(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authProbeRetry]);

  const {
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
  } = useAdminSubmissions({ authState, typeFilter, statusFilter });

  async function handleLogin(event) {
    event.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await adminLogin(password);
      setAuthProbeError('');
      setAuthState(true);
      setPassword('');
      showToast('登入成功', 'success');
    } catch (error) {
      showToast(formatShareWallError(error, '登入失敗'), 'error');
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    const ok = await showConfirm('確定登出管理後台？', { title: '登出' });
    if (!ok) return;
    try {
      await adminLogout();
    } catch {
      // cookie clear may still succeed client-side
    }
    setAuthState(false);
    setPreviewDeck(null);
    showToast('已登出');
  }

  async function runStatusAction(kind, id, status, label) {
    const ok = await showConfirm(`確定將此項目設為「${label}」？`, {
      title: '確認操作',
      danger: status === 'deleted',
    });
    if (!ok) return;

    const key = `${kind}-${id}-${status}`;
    setActionId(key);
    try {
      if (kind === 'deck') await patchDeckStatus(id, status);
      else await patchMessageStatus(id, status);
      showToast('狀態已更新', 'success');
      reload();
    } catch (error) {
      showToast(formatShareWallError(error, '操作失敗'), 'error');
    } finally {
      setActionId(null);
    }
  }

  async function handlePreviewDeck(id) {
    setPreviewLoadingId(id);
    try {
      const deck = await fetchAdminDeck(id);
      setPreviewDeck(deck);
    } catch (error) {
      showToast(formatShareWallError(error, '無法載入牌組'), 'error');
    } finally {
      setPreviewLoadingId(null);
    }
  }

  if (authState === null) {
    return (
      <section className="mx-auto max-w-md">
        <div className="flex min-h-48 items-center justify-center text-gray-400" aria-busy="true">
          驗證登入狀態…
        </div>
      </section>
    );
  }

  if (authState === false) {
    return (
      <section className="mx-auto max-w-md">
        <header className="mb-6 text-center">
          <Shield className="mx-auto mb-2 h-10 w-10 text-brand-gold" aria-hidden strokeWidth={2} />
          <h2 className="text-xl font-bold text-brand-gold">管理後台</h2>
        </header>
        {authProbeError && (
          <div className="mb-4 rounded-lg border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
            <p>{authProbeError}</p>
            <button
              type="button"
              onClick={() => {
                setAuthState(null);
                setAuthProbeError('');
                setAuthProbeRetry((n) => n + 1);
              }}
              className="mt-3 rounded border border-red-400 px-3 py-1 text-red-100 transition hover:bg-red-500/20"
            >
              重新檢查
            </button>
          </div>
        )}
        {!authProbeError && (
          <form onSubmit={handleLogin} className="rounded-lg border-2 border-[#444] bg-[#252525] p-6 space-y-4">
            <div>
              <label htmlFor="admin-password" className="mb-1 block text-sm text-gray-400">
                管理員密碼
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-[#555] bg-[#222] px-3 py-2 text-white outline-none focus:border-brand-gold"
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded bg-brand-gold py-2.5 font-bold text-neutral-900 transition hover:bg-amber-500 disabled:opacity-50"
            >
              {isLoggingIn ? '登入中…' : '登入'}
            </button>
          </form>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-brand-gold">管理後台</h2>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-[#555] px-3 py-1.5 text-sm text-gray-300 transition hover:border-brand-gold"
        >
          登出
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTypeFilter(opt.id)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              typeFilter === opt.id
                ? 'bg-brand-gold text-neutral-900'
                : 'border border-[#555] text-gray-300 hover:border-brand-gold'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStatusFilter(opt.id)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === opt.id
                ? 'bg-[#2b5797] text-white'
                : 'border border-[#555] text-gray-300 hover:border-[#2b5797]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <AsyncPanel
        isLoading={isLoading}
        isRetrying={isRetrying}
        isError={isError}
        errorMessage={isError && errorMessage === 'Unauthorized' ? '登入已過期，請重新登入' : errorMessage}
        onRetry={() => {
          if (errorMessage === 'Unauthorized') {
            setAuthState(false);
            return;
          }
          reload();
        }}
        isEmpty={decks.length === 0 && messages.length === 0}
        emptyTitle="此篩選條件下沒有項目"
      >
        <div className="space-y-8">
          {(typeFilter === 'all' || typeFilter === 'deck') && decks.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-gray-300">牌組（{decks.length}）</h3>
              <ul className="space-y-3">
                {decks.map((deck) => (
                  <AdminItem
                    key={`deck-${deck.id}`}
                    title={deck.title}
                    meta={`作者：${deck.author_name} · 狀態：${deck.status}`}
                    sub={deck.description}
                    dates={`投稿 ${formatApiDate(deck.created_at)} · 審核 ${formatApiDate(deck.reviewed_at)}`}
                    shareId={deck.share_id}
                    actionId={actionId}
                    itemKey={`deck-${deck.id}`}
                    onPreview={() => handlePreviewDeck(deck.id)}
                    previewLoading={previewLoadingId === deck.id}
                    onAction={(status, label) => runStatusAction('deck', deck.id, status, label)}
                  />
                ))}
              </ul>
              {loadMoreDecksError && (
                <p className="mt-2 text-sm text-red-400" role="alert">
                  {loadMoreDecksError}
                </p>
              )}
              <LoadMoreButton
                hasMore={decksHasMore}
                isLoading={isLoadingMoreDecks}
                onClick={handleLoadMoreDecks}
                label="載入更多牌組"
              />
            </div>
          )}

          {(typeFilter === 'all' || typeFilter === 'guestbook') && messages.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-gray-300">留言（{messages.length}）</h3>
              <ul className="space-y-3">
                {messages.map((msg) => (
                  <AdminItem
                    key={`msg-${msg.id}`}
                    title={msg.author_name}
                    meta={`狀態：${msg.status}`}
                    sub={msg.message}
                    dates={`投稿 ${formatApiDate(msg.created_at)} · 審核 ${formatApiDate(msg.reviewed_at)}`}
                    actionId={actionId}
                    itemKey={`message-${msg.id}`}
                    onAction={(status, label) => runStatusAction('message', msg.id, status, label)}
                  />
                ))}
              </ul>
              {loadMoreMessagesError && (
                <p className="mt-2 text-sm text-red-400" role="alert">
                  {loadMoreMessagesError}
                </p>
              )}
              <LoadMoreButton
                hasMore={messagesHasMore}
                isLoading={isLoadingMoreMessages}
                onClick={handleLoadMoreMessages}
                label="載入更多留言"
              />
            </div>
          )}
        </div>
      </AsyncPanel>

      {previewDeck && (
        <DeckPreviewModal deck={previewDeck} onClose={() => setPreviewDeck(null)} />
      )}
    </section>
  );
}

function DeckPreviewModal({ deck, onClose }) {
  const deckCount =
    deck.deck_json.leader.length + deck.deck_json.rituals.length + deck.deck_json.main.length;
  const ruleLabel =
    deck.rule_json?.type === 'rule2'
      ? `雙教團（${deck.rule_json.primary}／${deck.rule_json.secondary}）`
      : deck.rule_json?.primary
        ? `單教團（${deck.rule_json.primary}）`
        : '—';

  return (
    <div className="fixed inset-0 z-[9800] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-preview-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-700 bg-neutral-900 px-5 py-4">
          <h3 id="deck-preview-title" className="text-base font-bold text-brand-gold">
            牌組預覽
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-gray-400 hover:text-white"
          >
            關閉
          </button>
        </div>
        <div className="space-y-4 px-5 py-4 text-sm">
          <div>
            <p className="font-bold text-brand-gold">{deck.title}</p>
            <p className="text-gray-400">作者：{deck.author_name}</p>
            {deck.description && <p className="mt-2 text-gray-300">{deck.description}</p>}
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">構築規則</dt>
              <dd className="text-gray-200">{ruleLabel}</dd>
            </div>
            <div>
              <dt className="text-gray-500">牌組張數</dt>
              <dd className="text-gray-200">{deckCount} / 24</dd>
            </div>
            <div>
              <dt className="text-gray-500">分享 ID</dt>
              <dd className="font-mono text-xs text-gray-400">#{deck.share_id}</dd>
            </div>
            <div>
              <dt className="text-gray-500">狀態</dt>
              <dd className="text-gray-200">{deck.status}</dd>
            </div>
          </dl>
          <DeckIdList label="教主" ids={deck.deck_json.leader} />
          <DeckIdList label="儀式" ids={deck.deck_json.rituals} />
          <DeckIdList label="主牌" ids={deck.deck_json.main} />
        </div>
      </div>
    </div>
  );
}

function DeckIdList({ label, ids }) {
  return (
    <div>
      <p className="mb-1 text-gray-500">
        {label}（{ids.length}）
      </p>
      {ids.length === 0 ? (
        <p className="text-xs text-gray-500">—</p>
      ) : (
        <ul className="space-y-1 text-xs text-gray-300">
          {ids.map((id) => (
            <li key={id}>
              <span className="font-medium text-gray-200">{cardNamesById[id] ?? id}</span>
              <span className="ml-2 font-mono text-gray-500">{id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminItem({
  title,
  meta,
  sub,
  dates,
  shareId,
  actionId,
  itemKey,
  onPreview,
  previewLoading = false,
  onAction,
}) {
  const busy = actionId?.startsWith(itemKey);
  return (
    <li className="rounded-lg border border-[#444] bg-[#252525] p-4">
      <div className="mb-2">
        <h4 className="font-bold text-brand-gold">{title}</h4>
        <p className="text-sm text-gray-400">{meta}</p>
        {shareId && <p className="mt-1 font-mono text-xs text-gray-500">#{shareId}</p>}
        {sub && <p className="mt-2 line-clamp-3 text-sm text-gray-300">{sub}</p>}
        <p className="mt-2 text-xs text-gray-500">{dates}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {onPreview && (
          <button
            type="button"
            disabled={busy || previewLoading}
            onClick={onPreview}
            className="inline-flex items-center gap-1 rounded border border-[#555] px-3 py-1 text-sm text-gray-300 transition hover:border-brand-gold disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
            {previewLoading ? '載入中…' : '預覽'}
          </button>
        )}
        <ActionButton label="核准" disabled={busy} onClick={() => onAction('approved', '已核准')} />
        <ActionButton label="隱藏" disabled={busy} onClick={() => onAction('hidden', '已隱藏')} />
        <ActionButton
          label="刪除"
          danger
          disabled={busy}
          onClick={() => onAction('deleted', '已刪除')}
        />
      </div>
    </li>
  );
}

function ActionButton({ label, onClick, disabled, danger = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-3 py-1 text-sm font-medium transition disabled:opacity-50 ${
        danger
          ? 'bg-red-800 text-red-100 hover:bg-red-700'
          : 'bg-[#2b5797] text-white hover:bg-[#3a6db3]'
      }`}
    >
      {label}
    </button>
  );
}

import { ArrowLeft, Hammer } from 'lucide-react';
import { useCallback } from 'react';
import { fetchPublicDeck } from '../../api/shareWallApi.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { formatApiDate } from '../../utils/formatApiDate.js';
import AsyncPanel from '../common/AsyncPanel.jsx';

export default function DeckShareDetail({ shareId, onBack, onLoadDeck, isLoadingCards }) {
  const loadDeck = useCallback(() => fetchPublicDeck(shareId), [shareId]);
  const { data, isLoading, isRetrying, isError, errorMessage, reload } = useAsyncResource(loadDeck);

  const deckCount = data
    ? data.deck_json.leader.length + data.deck_json.rituals.length + data.deck_json.main.length
    : 0;

  const ruleLabel =
    data?.rule_json?.type === 'rule2'
      ? `雙教團（${data.rule_json.primary}／${data.rule_json.secondary}）`
      : data?.rule_json?.primary
        ? `單教團（${data.rule_json.primary}）`
        : '—';

  return (
    <section className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-brand-gold"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden strokeWidth={2.25} />
        返回分享牆
      </button>

      <AsyncPanel
        isLoading={isLoading}
        isRetrying={isRetrying}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={reload}
        isEmpty={!data}
        emptyTitle="找不到此牌組"
        emptyHint="可能尚未核准或已被移除"
      >
        {data && (
          <article className="rounded-lg border-2 border-brand-gold bg-[#252525] p-6">
            <header className="mb-4 border-b border-[#444] pb-4">
              <h2 className="text-2xl font-bold text-brand-gold">{data.title}</h2>
              <p className="mt-1 text-gray-400">作者：{data.author_name}</p>
              {data.description && <p className="mt-3 text-gray-300">{data.description}</p>}
            </header>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">構築規則</dt>
                <dd className="font-medium text-gray-200">{ruleLabel}</dd>
              </div>
              <div>
                <dt className="text-gray-500">牌組張數</dt>
                <dd className="font-medium text-gray-200">{deckCount} / 24</dd>
              </div>
              <div>
                <dt className="text-gray-500">最後核准時間</dt>
                <dd className="font-medium text-gray-200">{formatApiDate(data.reviewed_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">分享 ID</dt>
                <dd className="font-mono text-xs text-gray-400">{data.share_id}</dd>
              </div>
            </dl>

            <button
              type="button"
              disabled={isLoadingCards}
              onClick={() => onLoadDeck(data)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded bg-brand-gold py-3 font-bold text-neutral-900 transition hover:bg-amber-500 disabled:opacity-50 sm:w-auto sm:px-8"
            >
              <Hammer className="h-4 w-4 shrink-0" aria-hidden strokeWidth={2.25} />
              {isLoadingCards ? '卡牌載入中…' : '載入到組牌器'}
            </button>
          </article>
        )}
      </AsyncPanel>
    </section>
  );
}

import { mapAdminDeckListRow, mapAdminMessageRow } from '../../_shared/db.js';
import {
  ADMIN_LIST_DEFAULT,
  ADMIN_LIST_MAX,
  STATUSES,
} from '../../_shared/constants.js';
import { requireAdmin } from '../../_shared/auth.js';
import { parseLimitParam, resolvePageQuery } from '../../_shared/request.js';
import { nextCursorFrom } from '../../_shared/cursor.js';
import {
  createResponder,
  errorResponse,
  jsonResponse,
  runDbQuery,
} from '../../_shared/response.js';

const TYPE_VALUES = new Set(['deck', 'guestbook', 'all']);
const STATUS_FILTER_VALUES = new Set([...STATUSES, 'all']);

function buildStatusClause(status) {
  if (status === 'all') return { clause: '', bind: [] };
  return { clause: 'AND status = ?', bind: [status] };
}

/**
 * resolvePageQuery 只認 `cursor` 參數，但本端點有兩份獨立列表、各自一個游標。
 * 複製一份 URL 並把指定參數改名為 `cursor`，讓兩份列表共用同一套解析邏輯。
 *
 * @param {URL} url
 * @param {'deckCursor' | 'messageCursor'} paramName
 */
function withCursorParam(url, paramName) {
  const copy = new URL(url);
  const value = copy.searchParams.get(paramName);
  copy.searchParams.delete('cursor');
  if (value) copy.searchParams.set('cursor', value);
  return copy;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const { requestId, respond } = createResponder(request);
  const auth = await requireAdmin(request, env);
  if (auth.error) return respond(auth.error);

  const url = new URL(request.url);
  const type = url.searchParams.get('type') ?? 'all';
  const status = url.searchParams.get('status') ?? 'pending';

  if (!TYPE_VALUES.has(type)) return respond(errorResponse('Invalid type parameter', 400));
  if (!STATUS_FILTER_VALUES.has(status)) {
    return respond(errorResponse('Invalid status parameter', 400));
  }

  const limit = parseLimitParam(url, {
    defaultValue: ADMIN_LIST_DEFAULT,
    maxValue: ADMIN_LIST_MAX,
  });
  if (limit === null) return respond(errorResponse('Invalid limit parameter', 400));

  // 兩份列表各自分頁，故各有一個游標參數。共用一個 cursor 會在 type='all'
  // 時把牌組的位置套到留言上（兩者的 created_at 完全無關）。
  const deckPage = resolvePageQuery(withCursorParam(url, 'deckCursor'), 'created_at');
  if (deckPage.error) return respond(errorResponse(`deck ${deckPage.error}`, 400));

  const messagePage = resolvePageQuery(withCursorParam(url, 'messageCursor'), 'created_at');
  if (messagePage.error) return respond(errorResponse(`message ${messagePage.error}`, 400));

  const { clause, bind } = buildStatusClause(status);
  const fetchLimit = limit + 1;
  let decks = [];
  let messages = [];
  let decksHasMore = false;
  let messagesHasMore = false;
  let decksNextCursor = null;
  let messagesNextCursor = null;

  if (type === 'deck' || type === 'all') {
    const query = await runDbQuery('admin deck list query failed', requestId, () =>
      env.DB.prepare(
        `SELECT id, share_id, title, author_name, description, status, created_at, reviewed_at
         FROM deck_shares
         WHERE 1 = 1 ${clause} ${deckPage.clause}
         ORDER BY created_at DESC, id DESC
         ${deckPage.limitClause}`,
      )
        .bind(...bind, ...deckPage.bind, fetchLimit, ...deckPage.tailBind)
        .all(),
    );
    if (query.error) return respond(query.error);

    const rows = query.data.results ?? [];
    decksHasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    decks = pageRows.map(mapAdminDeckListRow);
    decksNextCursor = decksHasMore
      ? nextCursorFrom(pageRows[pageRows.length - 1], 'created_at')
      : null;
  }

  if (type === 'guestbook' || type === 'all') {
    const query = await runDbQuery('admin message list query failed', requestId, () =>
      env.DB.prepare(
        `SELECT id, author_name, message, status, created_at, reviewed_at
         FROM guestbook_messages
         WHERE 1 = 1 ${clause} ${messagePage.clause}
         ORDER BY created_at DESC, id DESC
         ${messagePage.limitClause}`,
      )
        .bind(...bind, ...messagePage.bind, fetchLimit, ...messagePage.tailBind)
        .all(),
    );
    if (query.error) return respond(query.error);

    const rows = query.data.results ?? [];
    messagesHasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    messages = pageRows.map(mapAdminMessageRow);
    messagesNextCursor = messagesHasMore
      ? nextCursorFrom(pageRows[pageRows.length - 1], 'created_at')
      : null;
  }

  return respond(
    jsonResponse({
      decks,
      messages,
      decksHasMore,
      messagesHasMore,
      decksNextCursor,
      messagesNextCursor,
    }),
  );
}

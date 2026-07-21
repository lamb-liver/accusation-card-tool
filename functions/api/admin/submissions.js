import { mapAdminDeckListRow, mapAdminMessageRow } from '../../_shared/db.js';
import {
  ADMIN_LIST_DEFAULT,
  ADMIN_LIST_MAX,
  STATUSES,
} from '../../_shared/constants.js';
import { requireAdmin } from '../../_shared/auth.js';
import { parseLimitParam, parseOffsetParam } from '../../_shared/request.js';
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

  const offset = parseOffsetParam(url);
  if (offset === null) return respond(errorResponse('Invalid offset parameter', 400));

  const { clause, bind } = buildStatusClause(status);
  const fetchLimit = limit + 1;
  let decks = [];
  let messages = [];
  let decksHasMore = false;
  let messagesHasMore = false;

  if (type === 'deck' || type === 'all') {
    const query = await runDbQuery('admin deck list query failed', requestId, () =>
      env.DB.prepare(
        `SELECT id, share_id, title, author_name, description, status, created_at, reviewed_at
         FROM deck_shares
         WHERE 1 = 1 ${clause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
        .bind(...bind, fetchLimit, offset)
        .all(),
    );
    if (query.error) return respond(query.error);

    const rows = query.data.results ?? [];
    decksHasMore = rows.length > limit;
    decks = rows.slice(0, limit).map(mapAdminDeckListRow);
  }

  if (type === 'guestbook' || type === 'all') {
    const query = await runDbQuery('admin message list query failed', requestId, () =>
      env.DB.prepare(
        `SELECT id, author_name, message, status, created_at, reviewed_at
         FROM guestbook_messages
         WHERE 1 = 1 ${clause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
        .bind(...bind, fetchLimit, offset)
        .all(),
    );
    if (query.error) return respond(query.error);

    const rows = query.data.results ?? [];
    messagesHasMore = rows.length > limit;
    messages = rows.slice(0, limit).map(mapAdminMessageRow);
  }

  return respond(jsonResponse({ decks, messages, decksHasMore, messagesHasMore }));
}

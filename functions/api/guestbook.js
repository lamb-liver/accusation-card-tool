import { mapPublicMessageRow } from '../_shared/db.js';
import { PUBLIC_LIST_DEFAULT, PUBLIC_LIST_HARD_CAP } from '../_shared/constants.js';
import { checkMutatingOrigin } from '../_shared/origin.js';
import { publicListJsonResponse } from '../_shared/publicListCache.js';
import { checkRateLimit } from '../_shared/rateLimit.js';
import { parseLimitParam, readJsonBody, resolvePageQuery } from '../_shared/request.js';
import { nextCursorFrom } from '../_shared/cursor.js';
import {
  createResponder,
  errorResponse,
  jsonResponse,
  runDbQuery,
} from '../_shared/response.js';
import { stripTurnstileToken } from '../_shared/submissionBody.js';
import { verifyTurnstileToken } from '../_shared/turnstile.js';
import { validateGuestbookSubmission } from '../_shared/validation.js';

const INSERT_SQL = `
  INSERT INTO guestbook_messages (author_name, message, status)
  VALUES (?, ?, 'pending')
`;

export async function onRequestPost(context) {
  const { request, env } = context;
  const { requestId, respond } = createResponder(request);

  const originError = checkMutatingOrigin(request, env);
  if (originError) return respond(originError);

  const rateLimitError = await checkRateLimit(request, env, 'POST:/api/guestbook');
  if (rateLimitError) return respond(rateLimitError);

  const { data, error } = await readJsonBody(request);
  if (error) return respond(error);

  const turnstileError = await verifyTurnstileToken(data?.turnstile_token, env, request);
  if (turnstileError) return respond(turnstileError);

  const payload = stripTurnstileToken(data);
  const validationError = validateGuestbookSubmission(payload);
  if (validationError) return respond(errorResponse(validationError, 400));

  const insert = await runDbQuery('guestbook insert failed', requestId, () =>
    env.DB.prepare(INSERT_SQL).bind(payload.author_name, payload.message).run(),
  );
  if (insert.error) return respond(insert.error);

  return respond(jsonResponse({ status: 'pending' }, 201));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const { requestId, respond } = createResponder(request);

  const limit = parseLimitParam(url, {
    defaultValue: PUBLIC_LIST_DEFAULT,
    maxValue: PUBLIC_LIST_HARD_CAP,
  });
  if (limit === null) return respond(errorResponse('Invalid limit parameter', 400));

  const page = resolvePageQuery(url, 'reviewed_at');
  if (page.error) return respond(errorResponse(page.error, 400));

  const fetchLimit = limit + 1;
  const query = await runDbQuery('guestbook list query failed', requestId, () =>
    env.DB.prepare(
      `SELECT id, author_name, message, reviewed_at, created_at
       FROM guestbook_messages
       WHERE status = 'approved' ${page.clause}
       ORDER BY reviewed_at DESC, id DESC
       ${page.limitClause}`,
    )
      .bind(...page.bind, fetchLimit, ...page.tailBind)
      .all(),
  );
  if (query.error) return respond(query.error);

  const rows = query.data.results ?? [];
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);

  return publicListJsonResponse(
    {
      // id 僅供產生游標，mapPublicMessageRow 不會把它放進回應
      messages: pageRows.map(mapPublicMessageRow),
      hasMore,
      nextCursor: hasMore ? nextCursorFrom(pageRows[pageRows.length - 1], 'reviewed_at') : null,
    },
    request,
    requestId,
  );
}

import { mapPublicMessageRow } from '../_shared/db.js';
import { PUBLIC_LIST_DEFAULT, PUBLIC_LIST_HARD_CAP } from '../_shared/constants.js';
import { checkMutatingOrigin } from '../_shared/origin.js';
import { publicListJsonResponse } from '../_shared/publicListCache.js';
import { checkRateLimit } from '../_shared/rateLimit.js';
import { parseLimitParam, parseOffsetParam, readJsonBody } from '../_shared/request.js';
import { apiResponse, errorResponse, jsonResponse, resolveRequestId } from '../_shared/response.js';
import { stripTurnstileToken } from '../_shared/submissionBody.js';
import { verifyTurnstileToken } from '../_shared/turnstile.js';
import { validateGuestbookSubmission } from '../_shared/validation.js';

const INSERT_SQL = `
  INSERT INTO guestbook_messages (author_name, message, status)
  VALUES (?, ?, 'pending')
`;

export async function onRequestPost(context) {
  const { request, env } = context;
  const respond = (response) => apiResponse(response, request);

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

  await env.DB.prepare(INSERT_SQL).bind(payload.author_name, payload.message).run();
  return respond(jsonResponse({ status: 'pending' }, 201));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const requestId = resolveRequestId(request);
  const respond = (response) => apiResponse(response, request);

  const limit = parseLimitParam(url, {
    defaultValue: PUBLIC_LIST_DEFAULT,
    maxValue: PUBLIC_LIST_HARD_CAP,
  });
  if (limit === null) return respond(errorResponse('Invalid limit parameter', 400));

  const offset = parseOffsetParam(url);
  if (offset === null) return respond(errorResponse('Invalid offset parameter', 400));

  const fetchLimit = limit + 1;
  const { results } = await env.DB.prepare(
    `SELECT author_name, message, reviewed_at, created_at
     FROM guestbook_messages
     WHERE status = 'approved'
     ORDER BY reviewed_at DESC, created_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(fetchLimit, offset)
    .all();

  const rows = results ?? [];
  const hasMore = rows.length > limit;

  return publicListJsonResponse(
    {
      messages: rows.slice(0, limit).map(mapPublicMessageRow),
      hasMore,
    },
    request,
    requestId,
  );
}

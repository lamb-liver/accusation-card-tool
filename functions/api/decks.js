import { mapPublicDeckListRow } from '../_shared/db.js';
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
  logApiError,
  runDbQuery,
} from '../_shared/response.js';
import { generateShareId, isUniqueConstraintError } from '../_shared/shareId.js';
import { stripTurnstileToken } from '../_shared/submissionBody.js';
import { verifyTurnstileToken } from '../_shared/turnstile.js';
import { validateDeckSubmission } from '../_shared/validation.js';

const INSERT_SQL = `
  INSERT INTO deck_shares (
    share_id, title, author_name, description, deck_json, rule_json, status
  ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
`;

export async function onRequestPost(context) {
  const { request, env } = context;
  const { requestId, respond } = createResponder(request);

  const originError = checkMutatingOrigin(request, env);
  if (originError) return respond(originError);

  const rateLimitError = await checkRateLimit(request, env, 'POST:/api/decks');
  if (rateLimitError) return respond(rateLimitError);

  const { data, error } = await readJsonBody(request);
  if (error) return respond(error);

  const turnstileError = await verifyTurnstileToken(data?.turnstile_token, env, request);
  if (turnstileError) return respond(turnstileError);

  const payload = stripTurnstileToken(data);
  const validationError = validateDeckSubmission(payload);
  if (validationError) return respond(errorResponse(validationError, 400));

  const description = payload.description ?? '';
  const deckJson = JSON.stringify(payload.deck_json);
  const ruleJson = JSON.stringify(payload.rule_json);

  let lastShareId = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shareId = generateShareId();
    lastShareId = shareId;
    try {
      await env.DB.prepare(INSERT_SQL)
        .bind(shareId, payload.title, payload.author_name, description, deckJson, ruleJson)
        .run();
      return respond(jsonResponse({ share_id: shareId, status: 'pending' }, 201));
    } catch (insertError) {
      if (isUniqueConstraintError(insertError)) {
        console.warn('deck share insert collision', {
          requestId,
          attempt: attempt + 1,
          shareId,
          title: payload.title,
        });
        continue;
      }
      logApiError('deck share insert failed', insertError, {
        requestId,
        attempt: attempt + 1,
        shareId,
        title: payload.title,
      });
      return respond(errorResponse('Internal server error', 500));
    }
  }

  logApiError(
    'deck share insert failed: share_id collision exhausted',
    new Error('share_id collision exhausted'),
    { requestId, attempts: 5, lastShareId, title: payload.title },
  );
  return respond(errorResponse('Internal server error', 500));
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
  const query = await runDbQuery('public deck list query failed', requestId, () =>
    env.DB.prepare(
      `SELECT id, share_id, title, author_name, description, reviewed_at, created_at
       FROM deck_shares
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
      // id 僅供產生游標，不進回應：公開 API 一向只給 share_id
      decks: pageRows.map(mapPublicDeckListRow),
      hasMore,
      nextCursor: hasMore ? nextCursorFrom(pageRows[pageRows.length - 1], 'reviewed_at') : null,
    },
    request,
    requestId,
  );
}

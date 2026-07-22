import { requireAdmin } from './auth.js';
import { checkMutatingOrigin } from './origin.js';
import { readJsonBody } from './request.js';
import { createResponder, errorResponse, jsonResponse, runDbQuery } from './response.js';
import { canTransition, isValidStatus } from './statusMachine.js';
import { validateStatusPatch } from './validation.js';

/**
 * 表名無法用 bind 參數化，因此以白名單映射取得。
 * `kind` 只由本模組的呼叫端以字面量 'deck' / 'message' 傳入，永不來自請求資料——
 * 新增呼叫端時務必維持這個前提，否則此處的字串插值會變成注入點。
 */
const TABLES = {
  deck: 'deck_shares',
  message: 'guestbook_messages',
};

export async function patchSubmissionStatus(env, kind, id, nextStatus, requestId) {
  const table = TABLES[kind];
  if (!table) {
    return { error: errorResponse('Internal server error', 500) };
  }

  const currentQuery = await runDbQuery('status patch: read current failed', requestId, () =>
    env.DB.prepare(`SELECT id, status FROM ${table} WHERE id = ?`).bind(id).first(),
  );
  if (currentQuery.error) return currentQuery;

  const current = currentQuery.data;
  if (!current) return { error: errorResponse('Not found', 404) };
  if (!canTransition(current.status, nextStatus)) {
    return { error: errorResponse('Invalid status transition', 409) };
  }

  const updateQuery = await runDbQuery('status patch: update failed', requestId, () =>
    env.DB.prepare(
      `UPDATE ${table}
       SET status = ?, reviewed_at = datetime('now')
       WHERE id = ? AND status = ?`,
    )
      .bind(nextStatus, id, current.status)
      .run(),
  );
  if (updateQuery.error) return updateQuery;

  const changes = updateQuery.data.meta?.changes ?? 0;
  if (changes > 0) {
    return { data: { id, status: nextStatus } };
  }

  const latestQuery = await runDbQuery('status patch: re-read failed', requestId, () =>
    env.DB.prepare(`SELECT status FROM ${table} WHERE id = ?`).bind(id).first(),
  );
  if (latestQuery.error) return latestQuery;

  const latest = latestQuery.data;
  if (!latest) return { error: errorResponse('Not found', 404) };

  console.warn('status PATCH lost race', {
    kind,
    id,
    expectedStatus: current.status,
    nextStatus,
    actualStatus: latest.status,
  });

  if (!canTransition(latest.status, nextStatus)) {
    return { error: errorResponse('Invalid status transition', 409) };
  }

  return { error: errorResponse('Status changed concurrently', 409) };
}

export async function handleAdminStatusPatch(context, kind) {
  const { request, env, params } = context;
  const { requestId, respond } = createResponder(request);

  const originError = checkMutatingOrigin(request, env);
  if (originError) return respond(originError);

  const auth = await requireAdmin(request, env);
  if (auth.error) return respond(auth.error);

  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id < 1) return respond(errorResponse('Invalid id', 400));

  const { data, error } = await readJsonBody(request);
  if (error) return respond(error);

  const validationError = validateStatusPatch(data);
  if (validationError) return respond(errorResponse(validationError, 400));

  const nextStatus = data.status;
  if (!isValidStatus(nextStatus)) return respond(errorResponse('Invalid status', 400));

  const result = await patchSubmissionStatus(env, kind, id, nextStatus, requestId);
  if (result.error) return respond(result.error);
  return respond(jsonResponse(result.data));
}

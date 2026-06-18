import { requireAdmin } from './auth.js';
import { checkMutatingOrigin } from './origin.js';
import { readJsonBody } from './request.js';
import { apiResponse, errorResponse, jsonResponse } from './response.js';
import { canTransition, isValidStatus } from './statusMachine.js';
import { validateStatusPatch } from './validation.js';

const TABLES = {
  deck: 'deck_shares',
  message: 'guestbook_messages',
};

export async function patchSubmissionStatus(env, kind, id, nextStatus) {
  const table = TABLES[kind];
  if (!table) {
    return { error: errorResponse('Internal server error', 500) };
  }

  const current = await env.DB.prepare(`SELECT id, status FROM ${table} WHERE id = ?`)
    .bind(id)
    .first();

  if (!current) return { error: errorResponse('Not found', 404) };
  if (!canTransition(current.status, nextStatus)) {
    return { error: errorResponse('Invalid status transition', 409) };
  }

  const result = await env.DB.prepare(
    `UPDATE ${table}
     SET status = ?, reviewed_at = datetime('now')
     WHERE id = ? AND status = ?`,
  )
    .bind(nextStatus, id, current.status)
    .run();

  const changes = result.meta?.changes ?? 0;
  if (changes > 0) {
    return { data: { id, status: nextStatus } };
  }

  const latest = await env.DB.prepare(`SELECT status FROM ${table} WHERE id = ?`)
    .bind(id)
    .first();

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
  const respond = (response) => apiResponse(response, request);

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

  const result = await patchSubmissionStatus(env, kind, id, nextStatus);
  if (result.error) return respond(result.error);
  return respond(jsonResponse(result.data));
}

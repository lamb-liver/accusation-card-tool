import { errorResponse } from './response.js';
import { canTransition } from './statusMachine.js';

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

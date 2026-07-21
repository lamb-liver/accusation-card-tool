import { mapAdminDeckDetailRow } from '../../../_shared/db.js';
import { requireAdmin } from '../../../_shared/auth.js';
import {
  createResponder,
  errorResponse,
  jsonResponse,
  runDbQuery,
} from '../../../_shared/response.js';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const { requestId, respond } = createResponder(request);
  const auth = await requireAdmin(request, env);
  if (auth.error) return respond(auth.error);

  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    return respond(errorResponse('Invalid deck id', 400));
  }

  const query = await runDbQuery('admin deck detail query failed', requestId, () =>
    env.DB.prepare(
      `SELECT id, share_id, title, author_name, description, deck_json, rule_json, status, created_at, reviewed_at
       FROM deck_shares
       WHERE id = ?`,
    )
      .bind(id)
      .first(),
  );
  if (query.error) return respond(query.error);

  const row = query.data;
  if (!row) return respond(errorResponse('Deck not found', 404));

  const deck = mapAdminDeckDetailRow(row);
  if (!deck) return respond(errorResponse('Internal server error', 500));

  return respond(jsonResponse(deck));
}

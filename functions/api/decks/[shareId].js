import { mapPublicDeckRow } from '../../_shared/db.js';
import {
  createResponder,
  errorResponse,
  jsonResponse,
  runDbQuery,
} from '../../_shared/response.js';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const { requestId, respond } = createResponder(request);
  const shareId = params.shareId;

  const query = await runDbQuery('public deck detail query failed', requestId, () =>
    env.DB.prepare(
      `SELECT share_id, title, author_name, description, deck_json, rule_json, reviewed_at, created_at
       FROM deck_shares
       WHERE share_id = ? AND status = 'approved'`,
    )
      .bind(shareId)
      .first(),
  );
  if (query.error) return respond(query.error);

  const row = query.data;
  if (!row) return respond(errorResponse('Not found', 404));

  const mapped = mapPublicDeckRow(row);
  if (!mapped) return respond(errorResponse('Internal server error', 500));
  return respond(jsonResponse(mapped));
}

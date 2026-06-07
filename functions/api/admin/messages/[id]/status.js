import { requireAdmin } from '../../../../_shared/auth.js';
import { checkMutatingOrigin } from '../../../../_shared/origin.js';
import { readJsonBody } from '../../../../_shared/request.js';
import { apiResponse, errorResponse, jsonResponse } from '../../../../_shared/response.js';
import { patchSubmissionStatus } from '../../../../_shared/statusPatch.js';
import { isValidStatus } from '../../../../_shared/statusMachine.js';
import { validateStatusPatch } from '../../../../_shared/validation.js';

export async function onRequestPatch(context) {
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

  const result = await patchSubmissionStatus(env, 'message', id, nextStatus);
  if (result.error) return respond(result.error);
  return respond(jsonResponse(result.data));
}

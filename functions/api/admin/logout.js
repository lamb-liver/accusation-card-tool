import { clearAdminCookie, shouldSetSecureCookie } from '../../_shared/auth.js';
import { checkMutatingOrigin } from '../../_shared/origin.js';
import { apiResponse, jsonResponse } from '../../_shared/response.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const respond = (response) => apiResponse(response, request);

  const originError = checkMutatingOrigin(request, env);
  if (originError) return respond(originError);

  const secure = shouldSetSecureCookie(env);
  return respond(
    jsonResponse(
      { ok: true },
      200,
      { 'Set-Cookie': clearAdminCookie({ secure }) },
    ),
  );
}

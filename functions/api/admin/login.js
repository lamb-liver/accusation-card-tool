import {
  buildAdminCookie,
  createAdminToken,
  shouldSetSecureCookie,
  timingSafeEqual,
} from '../../_shared/auth.js';
import { checkMutatingOrigin } from '../../_shared/origin.js';
import { checkRateLimit } from '../../_shared/rateLimit.js';
import { readJsonBody } from '../../_shared/request.js';
import { createResponder, errorResponse, jsonResponse } from '../../_shared/response.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const { respond } = createResponder(request);

  const originError = checkMutatingOrigin(request, env);
  if (originError) return respond(originError);

  const rateLimitError = await checkRateLimit(request, env, 'POST:/api/admin/login');
  if (rateLimitError) return respond(rateLimitError);

  if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return respond(errorResponse('Server misconfigured', 500));
  }

  const { data, error } = await readJsonBody(request);
  if (error) return respond(error);

  if (!data || typeof data.password !== 'string') {
    return respond(errorResponse('password is required', 400));
  }

  if (!(await timingSafeEqual(data.password, env.ADMIN_PASSWORD))) {
    return respond(errorResponse('Invalid credentials', 401));
  }

  const token = await createAdminToken(env);
  const secure = shouldSetSecureCookie(env);

  return respond(
    jsonResponse(
      { ok: true },
      200,
      { 'Set-Cookie': buildAdminCookie(token, { secure }) },
    ),
  );
}

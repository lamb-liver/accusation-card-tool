import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from './constants.js';
import { errorResponse } from './response.js';

export function normalizeOrigin(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

export function parseAllowedOrigins(env) {
  const raw = env.ALLOWED_ORIGINS ?? '';
  return raw
    .split(',')
    .map((item) => normalizeOrigin(item.trim()))
    .filter(Boolean);
}

function resolveRequestOrigin(request) {
  const origin = normalizeOrigin(request.headers.get('Origin'));
  if (origin) return origin;

  const referer = request.headers.get('Referer');
  if (referer) return normalizeOrigin(referer);

  return null;
}

export function checkCsrfHeader(request, env) {
  if (env.REQUIRE_CSRF_HEADER === 'false') return null;

  const header = request.headers.get(CSRF_HEADER_NAME);
  if (header !== CSRF_HEADER_VALUE) {
    return errorResponse('Invalid request', 403);
  }
  return null;
}

export function checkMutatingOrigin(request, env) {
  const csrfError = checkCsrfHeader(request, env);
  if (csrfError) return csrfError;

  const origin = resolveRequestOrigin(request);
  if (!origin) {
    return errorResponse('Origin header is required', 403);
  }

  const allowed = parseAllowedOrigins(env);
  if (!allowed.includes(origin)) {
    return errorResponse('Origin not allowed', 403);
  }
  return null;
}

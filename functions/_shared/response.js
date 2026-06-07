export function resolveRequestId(request) {
  const raw = request.headers.get('X-Request-Id');
  if (raw && /^[\w-]{8,64}$/.test(raw)) return raw;
  return crypto.randomUUID();
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

export function errorResponse(message, status, extraHeaders = {}) {
  return jsonResponse({ error: message }, status, extraHeaders);
}

export function withRequestId(response, requestId) {
  const headers = new Headers(response.headers);
  headers.set('X-Request-Id', requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function apiResponse(response, request) {
  return withRequestId(response, resolveRequestId(request));
}

export function logApiError(scope, error, context = {}) {
  console.error(scope, context, error);
}

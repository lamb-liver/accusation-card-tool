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

/**
 * 每個 request 只解析一次 requestId，讓日誌與回應標頭指向同一個值。
 * （resolveRequestId 在客戶端未帶 X-Request-Id 時每次都產生新 UUID，
 * 重複呼叫會讓 log 記的 id 對不上客戶端收到的 id。）
 */
export function createResponder(request) {
  const requestId = resolveRequestId(request);
  return {
    requestId,
    respond: (response) => withRequestId(response, requestId),
  };
}

export function logApiError(scope, error, context = {}) {
  console.error(scope, context, error);
}

/**
 * 包裝 D1 查詢：失敗時記錄並回傳結構化 500，避免裸 throw 讓客戶端收到
 * 沒有 { error } 形狀、也沒有 X-Request-Id 的平台預設 500。
 *
 * @template T
 * @param {string} scope
 * @param {string} requestId
 * @param {() => Promise<T>} operation
 * @returns {Promise<{ data: T } | { error: Response }>}
 */
export async function runDbQuery(scope, requestId, operation) {
  try {
    return { data: await operation() };
  } catch (error) {
    logApiError(scope, error, { requestId });
    return { error: errorResponse('Internal server error', 500) };
  }
}

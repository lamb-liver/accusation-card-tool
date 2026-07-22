import { MAX_BODY_BYTES } from './constants.js';
import { buildKeysetClause, decodeCursor } from './cursor.js';
import { errorResponse } from './response.js';

export function requireJsonContentType(request) {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return errorResponse('Content-Type must be application/json', 415);
  }
  return null;
}

export async function readJsonBody(request) {
  const contentTypeError = requireJsonContentType(request);
  if (contentTypeError) return { error: contentTypeError };

  const contentLength = Number.parseInt(request.headers.get('Content-Length') ?? '', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { error: errorResponse('Request body too large', 413) };
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return { error: errorResponse('Request body too large', 413) };
  }

  if (!raw.trim()) {
    return { error: errorResponse('Request body is required', 400) };
  }

  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { error: errorResponse('Invalid JSON', 400) };
  }
}

export function parseLimitParam(url, { defaultValue, maxValue }) {
  const raw = url.searchParams.get('limit');
  if (raw === null || raw === '') return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.min(parsed, maxValue);
}

export function parseOffsetParam(url) {
  const raw = url.searchParams.get('offset');
  if (raw === null || raw === '') return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/**
 * 解析 `cursor` 查詢參數。
 *
 * 三種結果需分開處理，故不用 null 兼表「沒帶」與「不合法」：
 * - 沒帶 → `{ cursor: null }`，代表第一頁。
 * - 帶了且合法 → `{ cursor: {...} }`。
 * - 帶了但不合法 → `{ invalid: true }`，呼叫端回 400；不可靜默當成第一頁，
 *   否則「載入更多」會無聲地重複回傳第一頁。
 *
 * @param {URL} url
 * @returns {{ cursor: { sortValue: string, id: number } | null, invalid?: boolean }}
 */
export function parseCursorParam(url) {
  const raw = url.searchParams.get('cursor');
  if (raw === null || raw === '') return { cursor: null };

  const cursor = decodeCursor(raw);
  if (!cursor) return { cursor: null, invalid: true };
  return { cursor };
}

/**
 * 組出列表查詢的分頁片段，同時支援 cursor（新）與 offset（舊）。
 *
 * 為何仍留著 offset：service worker 會快取前端 bundle，部署後仍有使用者跑著
 * 舊前端。若後端只認 cursor，舊前端送的 `offset=20` 會被忽略、「載入更多」
 * 無聲地重複回傳第一頁。offset 路徑保留到舊快取自然淘汰後再移除。
 * 兩者同時出現時以 cursor 為準（只有新前端會送 cursor）。
 *
 * 用法（注意 bind 順序）：
 *   `WHERE ... ${statusClause} ${page.clause} ORDER BY ... ${page.limitClause}`
 *   `.bind(...statusBind, ...page.bind, fetchLimit, ...page.tailBind)`
 *
 * @param {URL} url
 * @param {string} timeColumn 主排序欄位名（字面量，不可來自請求資料）
 * @returns {{ clause: string, bind: Array<string|number>, limitClause: string,
 *   tailBind: number[], error?: undefined } | { error: string }}
 */
export function resolvePageQuery(url, timeColumn) {
  const { cursor, invalid } = parseCursorParam(url);
  if (invalid) return { error: 'Invalid cursor parameter' };

  if (cursor) {
    const keyset = buildKeysetClause(timeColumn, cursor);
    return {
      clause: keyset.clause,
      bind: keyset.bind,
      limitClause: 'LIMIT ?',
      tailBind: [],
    };
  }

  const offset = parseOffsetParam(url);
  if (offset === null) return { error: 'Invalid offset parameter' };
  return {
    clause: '',
    bind: [],
    limitClause: 'LIMIT ? OFFSET ?',
    tailBind: [offset],
  };
}

/**
 * 後端錯誤格式：{ "error": "..." }
 * 所有非 2xx 回應由此模組統一轉為 ShareWallApiError 往上拋。
 */
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from './csrfHeader.generated.js';

export class ShareWallApiError extends Error {
  /** @param {string} message */
  constructor(message, status) {
    super(message);
    this.name = 'ShareWallApiError';
    this.status = status;
  }
}

export const PUBLIC_PAGE_SIZE = 20;
export const ADMIN_PAGE_SIZE = 50;

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * @param {Response} response
 * @param {unknown} data
 */
function errorFromResponse(response, data) {
  const message =
    data && typeof data === 'object' && typeof data.error === 'string'
      ? data.error
      : `HTTP ${response.status}`;
  return new ShareWallApiError(message, response.status);
}

function buildListParams({ limit, offset } = {}) {
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function apiFetch(path, { method = 'GET', body, admin = false } = {}) {
  const headers = {
    [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };

  const response = await fetch(path, {
    method,
    credentials: admin ? 'include' : 'same-origin',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) throw errorFromResponse(response, data);
  return data;
}

export function fetchPublicDecks({ limit = PUBLIC_PAGE_SIZE, offset = 0 } = {}) {
  return apiFetch(`/api/decks${buildListParams({ limit, offset })}`);
}

export function fetchPublicDeck(shareId) {
  return apiFetch(`/api/decks/${encodeURIComponent(shareId)}`);
}

export function submitPublicDeck(payload) {
  return apiFetch('/api/decks', { method: 'POST', body: payload });
}

export function fetchGuestbookMessages({ limit = PUBLIC_PAGE_SIZE, offset = 0 } = {}) {
  return apiFetch(`/api/guestbook${buildListParams({ limit, offset })}`);
}

export function submitGuestbookMessage(payload) {
  return apiFetch('/api/guestbook', { method: 'POST', body: payload });
}

export function adminLogin(password) {
  return apiFetch('/api/admin/login', { method: 'POST', body: { password }, admin: true });
}

export function adminLogout() {
  return apiFetch('/api/admin/logout', { method: 'POST', admin: true });
}

export function fetchAdminSubmissions({
  type = 'all',
  status = 'pending',
  limit = ADMIN_PAGE_SIZE,
  offset = 0,
} = {}) {
  const params = new URLSearchParams({
    type,
    status,
    limit: String(limit),
    offset: String(offset),
  });
  return apiFetch(`/api/admin/submissions?${params}`, { admin: true });
}

export function fetchAdminDeck(id) {
  return apiFetch(`/api/admin/decks/${encodeURIComponent(String(id))}`, { admin: true });
}

export function patchDeckStatus(id, status) {
  return apiFetch(`/api/admin/decks/${id}/status`, {
    method: 'PATCH',
    body: { status },
    admin: true,
  });
}

export function patchMessageStatus(id, status) {
  return apiFetch(`/api/admin/messages/${id}/status`, {
    method: 'PATCH',
    body: { status },
    admin: true,
  });
}

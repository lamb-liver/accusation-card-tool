import { MAX_BODY_BYTES } from './constants.js';
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

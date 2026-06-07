import { PUBLIC_LIST_CACHE_MAX_AGE_SEC } from './constants.js';

async function digestHex(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function publicListJsonResponse(data, request, requestId) {
  const body = JSON.stringify(data);
  const etag = `"${(await digestHex(body)).slice(0, 16)}"`;
  const cacheControl = `public, max-age=${PUBLIC_LIST_CACHE_MAX_AGE_SEC}`;

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': cacheControl,
        'X-Request-Id': requestId,
      },
    });
  }

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      'Cache-Control': cacheControl,
      'X-Request-Id': requestId,
    },
  });
}

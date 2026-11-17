import { PUBLIC_LIST_CACHE_MAX_AGE_SEC } from './constants.js';

const CACHE_CONTROL = `public, max-age=${PUBLIC_LIST_CACHE_MAX_AGE_SEC}`;

async function digestHex(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function cacheStore() {
  if (typeof caches === 'undefined' || !caches.default) return null;
  return caches.default;
}

function cacheKey(request) {
  return new Request(request.url, { method: 'GET' });
}

export async function publicListJsonResponse(data, request, requestId) {
  const body = JSON.stringify(data);
  const etag = `"${(await digestHex(body)).slice(0, 16)}"`;

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': CACHE_CONTROL,
        'X-Request-Id': requestId,
      },
    });
  }

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      'Cache-Control': CACHE_CONTROL,
      'X-Request-Id': requestId,
    },
  });
}

/**
 * 公開 GET 在 60 秒內重用同一份回應，跳過 D1。
 * 只留下 200；404 與 500 不進快取，下架或剛通過的牌組不會被舊結果卡住超過這個窗。
 */
export async function servePublicGet(context, load) {
  const store = cacheStore();
  const request = context.request;
  if (store && request.method === 'GET') {
    const hit = await store.match(cacheKey(request));
    if (hit) {
      const etag = hit.headers.get('ETag');
      if (etag && request.headers.get('If-None-Match') === etag) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: etag,
            'Cache-Control': hit.headers.get('Cache-Control') || CACHE_CONTROL,
          },
        });
      }
      return hit;
    }
  }

  const response = await load();
  if (store && response.status === 200) {
    const put = store.put(cacheKey(request), response.clone()).catch(() => {});
    if (typeof context.waitUntil === 'function') context.waitUntil(put);
  }
  return response;
}

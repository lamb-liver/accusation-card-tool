/**
 * Rate limit（D1 原子 UPSERT）
 *
 * Assumptions:
 * - bucket_key 含時間窗 ID（endpoint:ip:windowId），每窗一行。
 * - INSERT … ON CONFLICT DO UPDATE SET hit_count = hit_count + 1 為單語句原子遞增。
 * - 低流量夠用；極高 QPS 仍可能因 D1 寫入延遲成為瓶頸，屆時遷 KV / Durable Objects。
 */
import { RATE_LIMITS } from './constants.js';
import { errorResponse } from './response.js';

const GLOBAL_CLEANUP_PROBABILITY = 0.02;
const GLOBAL_WINDOW_SEC = Math.max(...Object.values(RATE_LIMITS).map((item) => item.windowSec));

const UPSERT_SQL = `
  INSERT INTO rate_limit_buckets (bucket_key, hit_count)
  VALUES (?, 1)
  ON CONFLICT(bucket_key) DO UPDATE SET hit_count = hit_count + 1
  RETURNING hit_count
`;

function getClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function buildBucketKey(endpointKey, ip, windowSec) {
  const windowId = Math.floor(Date.now() / (windowSec * 1000));
  return `${endpointKey}:${ip}:${windowId}`;
}

async function maybeCleanupStaleBuckets(env) {
  if (Math.random() > GLOBAL_CLEANUP_PROBABILITY) return;
  const cutoff = new Date(Date.now() - GLOBAL_WINDOW_SEC * 1000).toISOString();
  await env.DB.prepare('DELETE FROM rate_limit_buckets WHERE created_at < ?').bind(cutoff).run();
}

export async function checkRateLimit(request, env, endpointKey) {
  const config = RATE_LIMITS[endpointKey];
  if (!config) return null;
  if (env.RATE_LIMIT_DISABLED === 'true') return null;

  await maybeCleanupStaleBuckets(env);

  const ip = getClientIp(request);
  const bucketKey = buildBucketKey(endpointKey, ip, config.windowSec);
  const row = await env.DB.prepare(UPSERT_SQL).bind(bucketKey).first();
  const hitCount = Number(row?.hit_count ?? 0);

  if (hitCount > config.max) {
    return errorResponse('Too many requests', 429);
  }

  return null;
}

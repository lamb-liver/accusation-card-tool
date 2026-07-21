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

/**
 * 只信任 Cloudflare 注入的 CF-Connecting-IP。
 *
 * X-Forwarded-For 完全由客戶端控制：拿它當 bucket key 等於讓攻擊者每次請求
 * 換一個桶，rate limit 形同虛設（含 admin login 的暴力破解上限）。取不到時
 * 回傳 null，由 checkRateLimit 決定如何處置，而非退回共用的 'unknown' 桶
 * ——共用桶會讓任何人用少量請求就把該端點對所有人鎖死。
 */
function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP');
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

  const ip = getClientIp(request);
  if (!ip) {
    // 正式環境必定在 Cloudflare 後方，缺這個標頭代表請求走了非預期路徑 → 拒絕，
    // 不要退回可共用／可偽造的桶。本機 wrangler dev 沒有此標頭，走固定 key；
    // 要完全關閉請設 RATE_LIMIT_DISABLED=true。
    if (env.ENVIRONMENT === 'production') {
      console.warn('rate limit: CF-Connecting-IP missing in production', { endpointKey });
      return errorResponse('Unable to identify client', 403);
    }
  }

  await maybeCleanupStaleBuckets(env);

  const bucketKey = buildBucketKey(endpointKey, ip ?? 'local-dev', config.windowSec);
  const row = await env.DB.prepare(UPSERT_SQL).bind(bucketKey).first();
  const hitCount = Number(row?.hit_count ?? 0);

  if (hitCount > config.max) {
    return errorResponse('Too many requests', 429);
  }

  return null;
}

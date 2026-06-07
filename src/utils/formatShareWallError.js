import { ShareWallApiError } from '../api/shareWallApi.js';

/**
 * @param {unknown} error
 * @param {string} [fallback]
 */
export function formatShareWallError(error, fallback = '操作失敗') {
  if (error instanceof ShareWallApiError) {
    if (error.status === 429) return '請求過於頻繁，請稍後再試';
    if (error.status === 403) return error.message || '請求被拒絕';
    if (error.status === 503) return '服務暫時無法使用，請稍後再試';
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

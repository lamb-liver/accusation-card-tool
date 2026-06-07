/**
 * D1 / SQLite datetime('now') 以 UTC 儲存，格式為 `YYYY-MM-DD HH:MM:SS`（無時區後綴）。
 * 解析時補上 `Z` 視為 UTC，再交給 toLocaleString 轉為使用者本地時區顯示。
 *
 * @param {string | null | undefined} value
 */
export function formatApiDate(value) {
  if (!value) return '—';

  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

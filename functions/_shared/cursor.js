/**
 * Keyset（cursor）分頁的游標編解碼。
 *
 * 為什麼不用 OFFSET：`LIMIT ? OFFSET ?` 的第 N 頁定義為「跳過前 N×limit 筆」，
 * 而前面的筆數會因新投稿或審核動作改變。使用者按「載入更多」時，若列表在
 * 兩次請求之間有項目被插入或移除，就會漏看或重複看到項目。
 *
 * Keyset 改以「上一頁最後一筆的排序鍵」當作起點（WHERE key < cursor），
 * 不受前面筆數變動影響。代價是不能跳頁——本專案只有「載入更多」，沒有頁碼。
 *
 * 排序鍵必須是全序，否則邊界上的項目會被跳過或重複。時間欄位（同秒）並不唯一，
 * 因此一律以 `id` 作為 tiebreaker：`ORDER BY <time> DESC, id DESC`。
 * `id` 為 AUTOINCREMENT，與 created_at 單調相關，作為次要鍵語意上等同原本的
 * `created_at DESC`，但保證唯一。
 *
 * 取捨——公開游標會包含內部自增 id：
 * base64 是編碼不是加密，游標對客戶端「不透明」僅指結構可自由更改，不代表內容
 * 保密。公開 API 的回應本身仍不含 id（維持只給 share_id）。之所以接受：
 * - `/api/admin/decks/{id}` 需認證，知道 id 不會多出任何能力。
 * - 公開列表本來就能一路載到底數出筆數，id 額外透露的只有「含未核准的總數」。
 * 留言板沒有 share_id 這類公開唯一欄位，若公開牌組改用 share_id 就會兩個端點
 * 各用一套 tiebreaker；統一用 id 較不易出錯。
 */

const CURSOR_VERSION = 1;

/**
 * @param {string} sortValue 主排序鍵的值（SQLite datetime 字串）
 * @param {number} id tiebreaker
 * @returns {string}
 */
export function encodeCursor(sortValue, id) {
  const json = JSON.stringify({ v: CURSOR_VERSION, s: sortValue, i: id });
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * @param {string} raw
 * @returns {{ sortValue: string, id: number } | null} 不合法回傳 null
 */
export function decodeCursor(raw) {
  if (typeof raw !== 'string' || raw === '') return null;

  let parsed;
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    parsed = JSON.parse(atob(padded + '='.repeat(padLen)));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  if (parsed.v !== CURSOR_VERSION) return null;
  if (typeof parsed.s !== 'string' || parsed.s === '') return null;
  if (!Number.isSafeInteger(parsed.i) || parsed.i < 1) return null;

  return { sortValue: parsed.s, id: parsed.i };
}

/**
 * Keyset 的 WHERE 片段：取排序在游標「之後」（DESC 即較小）的列。
 *
 * 展開為 `(time < ?) OR (time = ? AND id < ?)`——不能只寫 `time < ?`，
 * 否則與游標同一時間戳的其他列會被整批跳過。
 *
 * @param {string} timeColumn 主排序欄位名
 *   （由呼叫端以字面量傳入，不可來自請求資料——此處為字串插值）
 * @param {{ sortValue: string, id: number }} cursor
 * @returns {{ clause: string, bind: Array<string | number> }}
 */
export function buildKeysetClause(timeColumn, cursor) {
  return {
    clause: `AND (${timeColumn} < ? OR (${timeColumn} = ? AND id < ?))`,
    bind: [cursor.sortValue, cursor.sortValue, cursor.id],
  };
}

/**
 * 由本頁最後一列產生下一頁游標。
 *
 * @param {object | undefined} lastRow
 * @param {string} timeField
 * @returns {string | null} 沒有下一頁或缺欄位時回傳 null
 */
export function nextCursorFrom(lastRow, timeField) {
  if (!lastRow) return null;
  const sortValue = lastRow[timeField];
  const id = lastRow.id;
  if (typeof sortValue !== 'string' || !Number.isSafeInteger(id)) return null;
  return encodeCursor(sortValue, id);
}

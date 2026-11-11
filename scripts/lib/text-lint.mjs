/**
 * 卡牌與 QA 文字的「長得像、但不是同一個字」檢查。
 *
 * 這類字元肉眼看不出差別，卻會讓搜尋漏卡（例：注音「ㄧ」U+3127 與數字「一」U+4E00，
 * 灰燼皇后曾因此搜「限一次」找不到）。cards.json 由人工維護，check-content 直接擋下；
 * QA 每週從 Google 試算表覆寫，sync-qa 會先用 fixLookalikeText 自動修正，
 * 不必回頭改試算表也不會被下一次同步蓋回。
 */

/** 可安全自動替換的字元（替換結果唯一、不會改變語意） */
const AUTO_FIXES = [
  // 注音「ㄧ」在卡牌與 QA 中只會是誤植的「一」
  [/\u3127/g, '一'],
  // 零寬字元與 BOM：複製貼上帶進來，看不見但會切斷搜尋比對
  [/[\u200B-\u200D\u2060\uFEFF]/g, ''],
  // 不換行空白 → 一般空白
  [/\u00A0/g, ' '],
];

/** 只檢查、不自動修的字元：需要人判斷原本想打哪個字 */
const SUSPICIOUS = [
  ['注音符號', /[\u3105-\u312F\u31A0-\u31BF]/u],
  ['康熙部首／部首補充（外觀同一般漢字）', /[\u2E80-\u2EFF\u2F00-\u2FDF]/u],
  ['相容漢字（外觀同一般漢字）', /[\uF900-\uFAFF]/u],
  ['零寬字元或 BOM', /[\u200B-\u200D\u2060\uFEFF]/u],
  ['不換行空白', /\u00A0/u],
  ['全形英數字（資料一律用半形）', /[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/u],
];

/**
 * @param {string} text
 * @returns {string}
 */
export function fixLookalikeText(text) {
  let result = String(text ?? '');
  for (const [pattern, replacement] of AUTO_FIXES) result = result.replace(pattern, replacement);
  return result;
}

/**
 * @param {string} text
 * @returns {string[]} 命中的問題種類（空陣列表示沒問題）
 */
export function findLookalikeIssues(text) {
  const value = String(text ?? '');
  return SUSPICIOUS.filter(([, pattern]) => pattern.test(value)).map(([label]) => label);
}

/**
 * 分頁尚未建立／無內容時寫入的佔位題。
 *
 * 單一定義：sync-qa 產生它，qaLookup 與 check-qa-sync-safety 靠字串比對辨識它。
 * 若各自硬編字面值，改動措辭會讓兩個消費端靜默失效——卡片彈窗會把佔位分類
 * 當成有 QA，而同步安全防護會偵測不到內容流失卻仍回傳成功。
 */
export const QA_PLACEHOLDER_QUESTION = '目前尚無特定 QA';
export const QA_PLACEHOLDER = { q: QA_PLACEHOLDER_QUESTION, a: '歡迎補充！' };

/** @param {{ questions: { q: string }[] }} category */
export function isPlaceholderOnlyCategory(category) {
  return Boolean(category?.questions?.every((qa) => qa.q === QA_PLACEHOLDER_QUESTION));
}

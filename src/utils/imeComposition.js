/**
 * 輸入法是否正在組字。中文／日文選字時按 Enter 是「確認候選字」，
 * 不應觸發送出／確認；Escape 是「取消組字」，不應關閉對話框。
 * keyCode 229 為舊版瀏覽器缺少 isComposing 時的組字訊號。
 * @param {KeyboardEvent | import('react').KeyboardEvent} event
 */
export function isImeComposing(event) {
  return Boolean(event?.nativeEvent?.isComposing ?? event?.isComposing) || event?.keyCode === 229;
}

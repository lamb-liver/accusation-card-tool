/**
 * 教團在 UI 的顯示順序（不含「通用規則」；qaData 將通用規則永遠置頂）。
 *
 * 新增教團時：在此陣列加入名稱，並同步更新 types、試算表 QA 分頁（再 npm run sync:qa）、
 * cards.json，以及 public/images/icons/{名稱}左.webp、{名稱}右.webp。
 *
 * 圖示路徑約定：教團名稱須與檔名一致，路徑為 images/icons/{名稱}{左|右}.webp
 */
export const FACTION_ORDER = [
  '白狐神社',
  '鴉教團',
  '瘋人院',
  '門教團',
  '放逐者',
];

/** @param {'左'|'右'} side */
export function factionIconPath(name, side = '左') {
  return `images/icons/${name}${side}.webp`;
}

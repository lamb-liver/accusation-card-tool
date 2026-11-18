/**
 * QA 試算表分頁清單，以及與 FACTION_ORDER 的對照檢查。
 *
 * 這份檢查是純本地、不需網路的：新增教團時若只改 FACTION_ORDER、忘了
 * 在此加入對應分頁，validate:repo（PR CI）就會失敗，不必等到每週同步才爆。
 */
import { FACTION_ORDER } from '../../src/constants/factionOrder.js';

export const SHEETS = [
  { label: '通用規則', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=1169306065&single=true&output=csv' },
  { label: '白狐神社', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=1973167497&single=true&output=csv' },
  { label: '鴉教團', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=1253175233&single=true&output=csv' },
  { label: '瘋人院', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=332236121&single=true&output=csv' },
  { label: '門教團', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=2076037145&single=true&output=csv' },
  { label: '逐光者', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=719906907&single=true&output=csv' },
  { label: '禁忌廚房', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=1316542157&single=true&output=csv' },
  // VIR／CEN 分頁：卡號前綴 vir = 疫病中心、cen = 紫靈山（對照 public/cards.json）
  { label: '疫病中心', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=444439601&single=true&output=csv' },
  { label: '紫靈山', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=703670617&single=true&output=csv' },
  { label: '放逐者', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSPgmF_9uiGkG5t_1GxEnEBD3GSVFvj1MYTaXtKjLjIEa_XqIQcwrWpY9DHELim8zOhVkKcKCxIpSh8/pub?gid=333010439&single=true&output=csv' },
];

/** 非教團的 QA 專屬分類，不需對應 FACTION_ORDER */
export const NON_FACTION_CATEGORIES = new Set(['通用規則']);

/**
 * 新增教團時若忘了建 QA 分頁，卡片彈窗的「查看此教團常見問題」會靜默消失。
 *
 * @param {{ sheets?: { label: string }[], factionOrder?: string[], nonFactionCategories?: Set<string> }} [options]
 */
export function assertFactionCoverage({
  sheets = SHEETS,
  factionOrder = FACTION_ORDER,
  nonFactionCategories = NON_FACTION_CATEGORIES,
} = {}) {
  const labels = new Set(sheets.map((sheet) => sheet.label));
  const missing = factionOrder.filter((faction) => !labels.has(faction));
  if (missing.length > 0) {
    throw new Error(
      `SHEETS 缺少教團分頁：${missing.join('、')}。新增教團時需一併加入 QA 分頁設定`,
    );
  }
  const unknown = sheets
    .map((sheet) => sheet.label)
    .filter((label) => !factionOrder.includes(label) && !nonFactionCategories.has(label));
  if (unknown.length > 0) {
    throw new Error(`SHEETS 含未知分類：${unknown.join('、')}`);
  }
}

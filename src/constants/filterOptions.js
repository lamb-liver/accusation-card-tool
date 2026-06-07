import { FACTION_ORDER, factionIconPath } from './factionOrder.js';

/** 「全部」列表圖示（data URI，不依賴外部檔案） */
export const ICON_MENU_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23aaa'%3E%3Cpath d='M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z'/%3E%3C/svg%3E";

/** 篩選下拉顯示名稱（與卡牌 faction 值不同時在此覆寫） */
const FACTION_FILTER_LABELS = {
  放逐者: '放逐者 (中立)',
};

/**
 * 篩選選項的統一資料源。
 * FilterToolbar（桌面自訂下拉）與 MobileFilterDrawer（行動原生 select）共用此定義，
 * 教團順序見 factionOrder.js；新增教團時更新 FACTION_ORDER、試算表 QA 分頁，再 npm run sync:qa。
 * iconSrc 僅桌面版使用；行動版 select 忽略此欄位。
 */
export const FILTER_OPTIONS = {
  faction: [
    { value: 'all', label: '所有教團', iconSrc: ICON_MENU_SVG },
    ...FACTION_ORDER.map((name) => ({
      value: name,
      label: FACTION_FILTER_LABELS[name] ?? name,
      iconSrc: factionIconPath(name, '左'),
    })),
  ],
  type: [
    { value: 'all', label: '所有種類', iconSrc: ICON_MENU_SVG },
    { value: '教主', label: '教主',   iconSrc: null },
    { value: '儀式', label: '儀式',   iconSrc: null },
    { value: '信徒', label: '信徒',   iconSrc: null },
    { value: '魔法', label: '魔法',   iconSrc: null },
    { value: '地點', label: '地點',   iconSrc: null },
  ],
  symbol: [
    { value: 'all', label: '所有符號', iconSrc: ICON_MENU_SVG },
    { value: '夜幕', label: '夜幕',   iconSrc: 'images/icons/夜幕.webp' },
    { value: '凋零', label: '凋零',   iconSrc: 'images/icons/凋零.webp' },
    { value: '野性', label: '野性',   iconSrc: 'images/icons/野性.webp' },
    { value: '自然', label: '自然',   iconSrc: 'images/icons/自然.webp' },
    { value: '知識', label: '知識',   iconSrc: 'images/icons/知識.webp' },
    { value: '煉金', label: '煉金',   iconSrc: 'images/icons/煉金.webp' },
    { value: '醫藥', label: '醫藥',   iconSrc: 'images/icons/醫藥.webp' },
    { value: '禁忌', label: '禁忌',   iconSrc: 'images/icons/禁忌.webp' },
  ],
  mechanic: [
    { value: 'all', label: '所有效果關鍵字', iconSrc: ICON_MENU_SVG },
    { value: '詠頌', label: '詠頌', iconSrc: null },
    { value: '駐守', label: '駐守', iconSrc: null },
    { value: '解構', label: '解構', iconSrc: null },
    { value: '獻祭', label: '獻祭', iconSrc: null },
  ],
};

import { FACTION_ORDER } from './factionOrder.js';

/** 篩選下拉顯示名稱（與卡牌 faction 值不同時在此覆寫） */
const FACTION_FILTER_LABELS = {
  放逐者: '放逐者 (中立)',
};

/**
 * 篩選選項的統一資料源。
 * Native select intentionally uses text labels only; card/symbol art lives in the card views.
 * 教團順序見 factionOrder.js；新增教團時更新 FACTION_ORDER、試算表 QA 分頁，再 npm run sync:qa。
 */
export const FILTER_OPTIONS = {
  faction: [
    { value: 'all', label: '所有教團' },
    ...FACTION_ORDER.map((name) => ({
      value: name,
      label: FACTION_FILTER_LABELS[name] ?? name,
    })),
  ],
  type: [
    { value: 'all', label: '所有種類' },
    { value: '教主', label: '教主' },
    { value: '儀式', label: '儀式' },
    { value: '信徒', label: '信徒' },
    { value: '魔法', label: '魔法' },
    { value: '地點', label: '地點' },
  ],
  symbol: [
    { value: 'all', label: '所有符號' },
    { value: '夜幕', label: '夜幕' },
    { value: '凋零', label: '凋零' },
    { value: '野性', label: '野性' },
    { value: '自然', label: '自然' },
    { value: '知識', label: '知識' },
    { value: '煉金', label: '煉金' },
    { value: '醫藥', label: '醫藥' },
    { value: '禁忌', label: '禁忌' },
    { value: '灰燼', label: '灰燼' },
  ],
  /** 系列（卡牌 source 欄位）；新系列上市時在此加一項，test-search 會檢查所有卡的 source 都在清單內 */
  source: [
    { value: 'all', label: '所有系列' },
    { value: '夜與序幕', label: '夜與序幕' },
    { value: '知與癲狂', label: '知與癲狂' },
    { value: '光與盛宴', label: '光與盛宴' },
    { value: '疫與飛升', label: '疫與飛升' },
    { value: '比賽積分兌換', label: '比賽積分兌換' },
  ],
  mechanic: [
    { value: 'all', label: '所有效果關鍵字' },
    { value: '詠頌', label: '詠頌' },
    { value: '駐守', label: '駐守' },
    { value: '解構', label: '解構' },
    { value: '獻祭', label: '獻祭' },
    { value: '聖戰', label: '聖戰' },
    { value: '供品', label: '供品' },
    { value: '附著', label: '附著' },
    { value: '飛升', label: '飛升' },
  ],
};

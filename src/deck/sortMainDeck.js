import { factionRankForRule } from '../rules/deckPoolDisplay.js';
import { FACTION_ORDER } from '../constants/factionOrder.js';

/** @import { Card, DeckRule } from '../types.js' */

/** 主牌組種類排序權重：信徒 → 地點 → 魔法（教主／儀式不在主牌組） */
const TYPE_ORDER = { 信徒: 0, 地點: 1, 魔法: 2 };

/**
 * 主牌組排序：種類（信徒→地點→魔法）→ 教團（主→副→放逐者→其餘）→ 編號。
 * 不改動輸入陣列。
 * @param {Card[]} main
 * @param {DeckRule} rule
 * @returns {Card[]}
 */
export function sortMainDeck(main, rule) {
  if (!Array.isArray(main) || main.length <= 1) return main;

  // 主／副／放逐者的階層由 factionRankForRule 統一定義（與組牌池顯示同源）；
  // 其餘教團（未套用規則時）退回 FACTION_ORDER，放逐者於其中本就殿後
  const rankByRule = factionRankForRule(rule);
  const fallbackRank = (faction) => {
    const idx = FACTION_ORDER.indexOf(faction);
    return 100 + (idx === -1 ? FACTION_ORDER.length : idx);
  };
  const factionRank = (faction) => rankByRule(faction) ?? fallbackRank(faction);

  return [...main].sort((a, b) => {
    const ta = TYPE_ORDER[a.type] ?? 99;
    const tb = TYPE_ORDER[b.type] ?? 99;
    if (ta !== tb) return ta - tb;

    const fa = factionRank(a.faction);
    const fb = factionRank(b.faction);
    if (fa !== fb) return fa - fb;

    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });
}

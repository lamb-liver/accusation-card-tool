/** @import { Deck } from '../types.js' */

/**
 * 主牌組會出現的三種卡。教主／儀式有自己的欄位，不計入這裡。
 * 順序依使用者在組牌時會問的「地點、信徒、魔法」。
 */
export const MAIN_DECK_TYPES = ['地點', '信徒', '魔法'];

/**
 * 統計主牌組裡每種卡的張數。三種永遠都回傳（含 0），組牌過程才看得出比例。
 *
 * @param {Deck} deck
 * @returns {{ type: string, count: number }[]}
 */
export function collectMainDeckTypeCounts(deck) {
  const counts = Object.fromEntries(MAIN_DECK_TYPES.map((type) => [type, 0]));
  for (const card of deck.main ?? []) {
    if (typeof card?.type === 'string' && counts[card.type] !== undefined) {
      counts[card.type] += 1;
    }
  }
  return MAIN_DECK_TYPES.map((type) => ({ type, count: counts[type] }));
}

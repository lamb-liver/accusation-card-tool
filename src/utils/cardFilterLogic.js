import { FILTER_OPTIONS } from '../constants/filterOptions.js';

/** @typedef {{ faction?: string, type?: string, symbol?: string, mechanic?: string }} CardFilters */

const MECHANIC_TERMS = FILTER_OPTIONS.mechanic
  .map((option) => option.value)
  .filter((value) => value !== 'all');

/**
 * 搜尋用正規化：全半形統一、忽略大小寫／空白／標點，但保留 Δ 等有意義符號。
 * @param {unknown} value
 */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('zh-TW')
    .replace(/[\s\p{P}]+/gu, '');
}

/**
 * 數字越小越優先；null 表示不命中。
 * @param {object} card
 * @param {string} searchTerm
 * @returns {number | null}
 */
export function getCardSearchRank(card, searchTerm) {
  const query = normalizeSearchText(searchTerm);
  if (!query) return 0;

  const name = normalizeSearchText(card.name);
  if (name === query) return 1;
  if (name.startsWith(query)) return 2;
  if (name.includes(query)) return 3;

  const cardId = normalizeSearchText(card.id);
  if (query.length >= 2 && cardId.includes(query)) return 4;

  const effect = normalizeSearchText(card.effect);
  if (
    MECHANIC_TERMS.some(
      (term) => normalizeSearchText(term).includes(query) && effect.includes(normalizeSearchText(term)),
    )
  ) {
    return 5;
  }
  if (effect.includes(query)) return 6;
  return null;
}

function cardMatchesFacets(card, filters) {
  const matchesFaction = !filters.faction || card.faction === filters.faction;
  const matchesType = !filters.type || card.type === filters.type;
  const matchesSymbol =
    !filters.symbol || (card.symbols && card.symbols.includes(filters.symbol));
  const matchesMechanic =
    !filters.mechanic || (card.effect && card.effect.includes(filters.mechanic));

  return matchesFaction && matchesType && matchesSymbol && matchesMechanic;
}

/**
 * @param {object} card
 * @param {string} searchTerm
 * @param {CardFilters} filters
 */
export function cardMatchesFilters(card, searchTerm, filters) {
  return getCardSearchRank(card, searchTerm) !== null && cardMatchesFacets(card, filters);
}

/**
 * 保留原目錄作為同分 tie-break；沒有搜尋詞時不做額外排序。
 * @param {object[]} cards
 * @param {string} searchTerm
 * @param {CardFilters} filters
 */
export function filterAndRankCards(cards, searchTerm, filters) {
  const query = normalizeSearchText(searchTerm);
  if (!query) return cards.filter((card) => cardMatchesFacets(card, filters));

  return cards
    .map((card, index) => ({ card, index, rank: getCardSearchRank(card, query) }))
    .filter(({ card, rank }) => rank !== null && cardMatchesFacets(card, filters))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ card }) => card);
}

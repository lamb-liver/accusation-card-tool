import { FILTER_OPTIONS } from '../constants/filterOptions.js';

/** @typedef {{ faction?: string, type?: string, symbol?: string, mechanic?: string, source?: string }} CardFilters */

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

  // 直接打教團名（「鴉教團」「疫病中心」「疫病」）時列出該教團；排在卡名之後，
  // 讓卡名本身含有該字的卡仍優先。單字查詢不比對教團，避免「門」「鴉」整團灌入。
  const faction = normalizeSearchText(card.faction);
  if (query.length >= 2 && faction.includes(query)) return 5;

  // 系列、種類、符號也比對（「疫與飛升」「魔法」「夜幕」），同樣排在卡名之後、只限兩字以上。
  // 只比對開頭：「飛升」是紫靈山的機制，不能因為系列名「疫與飛升」含這兩個字就把整個系列 48 張灌進來
  if (query.length >= 2) {
    const facets = [card.source, card.type, ...(card.symbols ?? [])].map(normalizeSearchText);
    if (facets.some((facet) => facet && facet.startsWith(query))) return 5;
  }

  const effect = normalizeSearchText(card.effect);
  if (
    MECHANIC_TERMS.some(
      (term) => normalizeSearchText(term).includes(query) && effect.includes(normalizeSearchText(term)),
    )
  ) {
    return 6;
  }
  if (effect.includes(query)) return 7;
  return null;
}

/**
 * 依空白拆成多個關鍵字（各自正規化，空的丟掉）。
 * @param {unknown} searchTerm
 */
export function splitSearchTokens(searchTerm) {
  return String(searchTerm ?? '')
    .split(/\s+/u)
    .map(normalizeSearchText)
    .filter(Boolean);
}

/**
 * 整串先照原本方式比對（「第 十 三 夜」這類仍當成一個詞）；整串找不到時，
 * 再把空白分開的每個關鍵字都要命中（取交集），排在整串命中的卡之後。
 * @param {object} card
 * @param {string} searchTerm
 * @returns {number | null}
 */
export function getCardMultiSearchRank(card, searchTerm) {
  const whole = getCardSearchRank(card, searchTerm);
  if (whole !== null) return whole;
  const tokens = splitSearchTokens(searchTerm);
  if (tokens.length < 2) return null;
  let worst = 0;
  for (const token of tokens) {
    const rank = getCardSearchRank(card, token);
    if (rank === null) return null;
    worst = Math.max(worst, rank);
  }
  return 10 + worst;
}

function cardMatchesFacets(card, filters) {
  const matchesFaction = !filters.faction || card.faction === filters.faction;
  const matchesType = !filters.type || card.type === filters.type;
  const matchesSymbol =
    !filters.symbol || (card.symbols && card.symbols.includes(filters.symbol));
  const matchesMechanic =
    !filters.mechanic || (card.effect && card.effect.includes(filters.mechanic));
  const matchesSource = !filters.source || card.source === filters.source;

  return matchesFaction && matchesType && matchesSymbol && matchesMechanic && matchesSource;
}

/**
 * @param {object} card
 * @param {string} searchTerm
 * @param {CardFilters} filters
 */
export function cardMatchesFilters(card, searchTerm, filters) {
  return getCardMultiSearchRank(card, searchTerm) !== null && cardMatchesFacets(card, filters);
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
    .map((card, index) => ({ card, index, rank: getCardMultiSearchRank(card, searchTerm) }))
    .filter(({ card, rank }) => rank !== null && cardMatchesFacets(card, filters))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ card }) => card);
}

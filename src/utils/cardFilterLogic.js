/** @typedef {{ faction?: string, type?: string, symbol?: string, mechanic?: string }} CardFilters */

/**
 * @param {object} card
 * @param {string} searchTerm
 * @param {CardFilters} filters
 */
export function cardMatchesFilters(card, searchTerm, filters) {
  // 卡面編號如「CRO-01」，資料 id 為「cro01」：去除連字號/空白並轉小寫後比對，
  // 讓玩家拿實體卡輸入編號（含或不含連字號、大小寫皆可）也能搜到
  const normalizedIdQuery = searchTerm.replace(/[\s-]/g, '').toLowerCase();
  const matchesSearch =
    searchTerm === '' ||
    (card.name && card.name.includes(searchTerm)) ||
    (card.effect && card.effect.includes(searchTerm)) ||
    (normalizedIdQuery !== '' && card.id && card.id.toLowerCase().includes(normalizedIdQuery));

  const matchesFaction = !filters.faction || card.faction === filters.faction;
  const matchesType = !filters.type || card.type === filters.type;
  const matchesSymbol =
    !filters.symbol || (card.symbols && card.symbols.includes(filters.symbol));
  const matchesMechanic =
    !filters.mechanic || (card.effect && card.effect.includes(filters.mechanic));

  return matchesSearch && matchesFaction && matchesType && matchesSymbol && matchesMechanic;
}

/**
 * @param {object[]} cards
 * @param {string} searchTerm
 * @param {CardFilters} filters
 * @returns {number[]} indices into `cards`
 */
export function filterCardIndices(cards, searchTerm, filters) {
  const indices = [];
  for (let i = 0; i < cards.length; i++) {
    if (cardMatchesFilters(cards[i], searchTerm, filters)) indices.push(i);
  }
  return indices;
}

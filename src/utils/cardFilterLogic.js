/** @typedef {{ faction?: string, type?: string, symbol?: string, mechanic?: string }} CardFilters */

/**
 * @param {object} card
 * @param {string} searchTerm
 * @param {CardFilters} filters
 */
export function cardMatchesFilters(card, searchTerm, filters) {
  const matchesSearch =
    searchTerm === '' ||
    (card.name && card.name.includes(searchTerm)) ||
    (card.effect && card.effect.includes(searchTerm));

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

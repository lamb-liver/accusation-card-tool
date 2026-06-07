import { filterCardIndices } from '../utils/cardFilterLogic.js';

/** @type {object[] | null} */
let cards = null;

self.onmessage = (event) => {
  const { type, requestId, payload } = event.data;

  if (type === 'init') {
    cards = payload.cards;
    self.postMessage({ type: 'ready', requestId });
    return;
  }

  if (type === 'filter' && cards) {
    const indices = filterCardIndices(cards, payload.searchTerm, payload.filters);
    self.postMessage({ type: 'result', requestId, indices });
  }
};

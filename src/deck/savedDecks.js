function createSavedDeckEntry(name, deck, rule) {
  return {
    name,
    deck,
    rule,
    savedAt: Date.now(),
  };
}

export function upsertSavedDeck(savedDecks, name, deck, rule, maxSavedDecks) {
  const existsIndex = savedDecks.findIndex((saved) => saved.name === name);
  const entry = createSavedDeckEntry(name, deck, rule);

  if (existsIndex !== -1) {
    const next = [...savedDecks];
    next[existsIndex] = entry;
    return { kind: 'updated', next };
  }

  if (savedDecks.length >= maxSavedDecks) {
    return { kind: 'limit', next: savedDecks };
  }

  return { kind: 'added', next: [...savedDecks, entry] };
}

export function findSavedDeckByName(savedDecks, name) {
  return savedDecks.find((saved) => saved.name === name) || null;
}

export function removeSavedDeckByName(savedDecks, name) {
  return savedDecks.filter((saved) => saved.name !== name);
}

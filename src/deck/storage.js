import {
  RULE_STATE_KEY,
  SAVED_DECKS_KEY,
  STORAGE_KEY,
} from './constants.js';
import { normalizeImportedRule } from './normalizeImportedRule.js';

/** @param {unknown} item */
function isCardLike(item) {
  return Boolean(item && typeof item === 'object' && typeof item.id === 'string');
}

/**
 * 驗證並正規化 localStorage 中的牌組結構；無效欄位過濾，全壞則回傳空牌組。
 * @param {unknown} raw
 * @returns {import('../types.js').Deck}
 */
export function normalizeDeck(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { leader: [], rituals: [], main: [] };
  }

  const leader = Array.isArray(raw.leader) ? raw.leader.filter(isCardLike) : [];
  const rituals = Array.isArray(raw.rituals) ? raw.rituals.filter(isCardLike) : [];
  const main = Array.isArray(raw.main) ? raw.main.filter(isCardLike) : [];

  return { leader, rituals, main };
}

/**
 * @param {unknown} entry
 * @returns {import('../types.js').SavedDeck | null}
 */
export function normalizeSavedDeckEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  if (!name) return null;

  return {
    name,
    deck: normalizeDeck(entry.deck),
    rule:
      entry.rule && typeof entry.rule === 'object' && !Array.isArray(entry.rule)
        ? normalizeImportedRule(entry.rule)
        : undefined,
    savedAt: typeof entry.savedAt === 'number' ? entry.savedAt : Date.now(),
  };
}

export function persistActiveDeck(deck) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
}

export function persistSavedDecks(savedDecks) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(savedDecks));
}

export function persistRuleState(currentRule, primaryFaction, secondaryFaction) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    RULE_STATE_KEY,
    JSON.stringify({ currentRule, primaryFaction, secondaryFaction }),
  );
}

/**
 * 依 patch 欄位寫入 localStorage；任一步失敗則回滾已寫入的 key。
 */
export function persistStatePatch(
  { deck, savedDecks, currentRule, primaryFaction, secondaryFaction },
  fields,
) {
  if (typeof localStorage === 'undefined') return;

  /** @type {Array<[string, string | null]>} */
  const completed = [];

  const rollback = () => {
    for (const [key, previous] of completed) {
      if (previous === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous);
    }
  };

  try {
    if (fields.deck) {
      completed.push([STORAGE_KEY, localStorage.getItem(STORAGE_KEY)]);
      persistActiveDeck(deck);
    }
    if (fields.savedDecks) {
      completed.push([SAVED_DECKS_KEY, localStorage.getItem(SAVED_DECKS_KEY)]);
      persistSavedDecks(savedDecks);
    }
    if (fields.rule) {
      completed.push([RULE_STATE_KEY, localStorage.getItem(RULE_STATE_KEY)]);
      persistRuleState(currentRule, primaryFaction, secondaryFaction);
    }
  } catch (error) {
    rollback();
    throw error;
  }
}

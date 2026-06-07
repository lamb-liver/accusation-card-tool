import {
  EMPTY_DECK,
  EMPTY_RULE,
  RULE_STATE_KEY,
  SAVED_DECKS_KEY,
  STORAGE_KEY,
  VALID_RULE_TYPES,
} from './constants.js';
import { normalizeImportedRule } from './normalizeImportedRule.js';
import { collectDeckStructureViolations } from './deckCompositionRules.js';
import { normalizeDeck, normalizeSavedDeckEntry } from './storage.js';

/** @import { Deck, DeckRule } from '../types.js' */

export function loadActiveDeck() {
  if (typeof localStorage === 'undefined') return { ...EMPTY_DECK };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeDeck(JSON.parse(raw)) : { ...EMPTY_DECK };
  } catch {
    return { ...EMPTY_DECK };
  }
}

export function loadRuleState() {
  if (typeof localStorage === 'undefined') {
    return { currentRule: EMPTY_RULE, primaryFaction: '', secondaryFaction: '' };
  }
  try {
    const raw = localStorage.getItem(RULE_STATE_KEY);
    if (!raw) {
      return { currentRule: EMPTY_RULE, primaryFaction: '', secondaryFaction: '' };
    }

    const parsed = JSON.parse(raw);
    const rule = parsed.currentRule;
    const validRule =
      rule &&
      typeof rule === 'object' &&
      typeof rule.isActive === 'boolean' &&
      typeof rule.type === 'string' &&
      VALID_RULE_TYPES.includes(rule.type)
        ? normalizeImportedRule(rule)
        : EMPTY_RULE;

    return {
      currentRule: validRule,
      primaryFaction: typeof parsed.primaryFaction === 'string' ? parsed.primaryFaction : '',
      secondaryFaction: typeof parsed.secondaryFaction === 'string' ? parsed.secondaryFaction : '',
    };
  } catch {
    return { currentRule: EMPTY_RULE, primaryFaction: '', secondaryFaction: '' };
  }
}

export function loadSavedDecks() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_DECKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSavedDeckEntry).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 冷啟動：驗證 localStorage 還原的牌組＋規則；不合法則回退空狀態。
 */
export function sanitizePersistedDeckState(deck, currentRule, primaryFaction, secondaryFaction) {
  const issues = collectDeckStructureViolations(deck, currentRule);
  if (issues.length === 0) {
    return {
      deck,
      currentRule,
      primaryFaction,
      secondaryFaction,
      wasSanitized: false,
      reason: '',
    };
  }

  return {
    deck: { ...EMPTY_DECK },
    currentRule: { ...EMPTY_RULE },
    primaryFaction: '',
    secondaryFaction: '',
    wasSanitized: true,
    reason: issues.join('；'),
  };
}

/**
 * 控制器初始化：載入並驗證 active deck + rule。
 */
export function loadInitialControllerState() {
  const initialRule = loadRuleState();
  return sanitizePersistedDeckState(
    loadActiveDeck(),
    initialRule.currentRule,
    initialRule.primaryFaction,
    initialRule.secondaryFaction,
  );
}

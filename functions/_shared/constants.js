import { DECK_COMPOSITION_LIMITS } from '../../shared/deckCompositionCore.js';

export const STATUSES = ['pending', 'approved', 'hidden', 'deleted'];

export const MAX_BODY_BYTES = 32 * 1024;
export const PUBLIC_LIST_HARD_CAP = 100;
export const ADMIN_LIST_DEFAULT = 50;
export const ADMIN_LIST_MAX = 100;

export const FIELD_LIMITS = {
  deckTitle: { min: 1, max: 40 },
  authorName: { min: 1, max: 24 },
  description: { max: 240 },
  guestbookMessage: { min: 1, max: 300 },
};

/** 牌組張數上限唯一來源為 shared/deckCompositionCore.js；此處僅改鍵名供 validation.js 使用 */
export const DECK_LIMITS = {
  leader: DECK_COMPOSITION_LIMITS.maxLeader,
  rituals: DECK_COMPOSITION_LIMITS.maxRituals,
  main: DECK_COMPOSITION_LIMITS.maxMain,
  total: DECK_COMPOSITION_LIMITS.maxTotal,
  rule2PrimaryMain: DECK_COMPOSITION_LIMITS.rule2PrimaryMain,
  rule2SecondaryMain: DECK_COMPOSITION_LIMITS.rule2SecondaryMain,
};

export const PUBLIC_LIST_DEFAULT = 20;
export const PUBLIC_LIST_CACHE_MAX_AGE_SEC = 60;
export const RATE_LIMITS = {
  'POST:/api/decks': { max: 5, windowSec: 3600 },
  'POST:/api/guestbook': { max: 10, windowSec: 3600 },
  'POST:/api/admin/login': { max: 10, windowSec: 900 },
};

export { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from './csrf.generated.js';

export const ADMIN_COOKIE_NAME = 'admin_session';
export const ADMIN_SESSION_MAX_AGE_SEC = 8 * 60 * 60;

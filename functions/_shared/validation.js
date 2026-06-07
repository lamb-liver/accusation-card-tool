import { cardIds, factions } from './cardManifest.generated.js';
import { DECK_LIMITS, FIELD_LIMITS } from './constants.js';
import { validateDeckComposition } from './deckComposition.js';

function stringLength(value) {
  return [...String(value)].length;
}

function validateStringField(value, { name, min = 0, max }) {
  if (typeof value !== 'string') return `${name} must be a string`;
  const len = stringLength(value);
  if (len < min) return `${name} must be at least ${min} characters`;
  if (len > max) return `${name} must be at most ${max} characters`;
  return null;
}

function validateStringArray(value, name) {
  if (!Array.isArray(value)) return `${name} must be an array`;
  if (!value.every((item) => typeof item === 'string' && item.length > 0)) {
    return `${name} must contain only non-empty strings`;
  }
  return null;
}

export function validateDeckSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be an object';
  }

  const titleError = validateStringField(body.title, {
    name: 'title',
    min: FIELD_LIMITS.deckTitle.min,
    max: FIELD_LIMITS.deckTitle.max,
  });
  if (titleError) return titleError;

  const authorError = validateStringField(body.author_name, {
    name: 'author_name',
    min: FIELD_LIMITS.authorName.min,
    max: FIELD_LIMITS.authorName.max,
  });
  if (authorError) return authorError;

  const description =
    body.description === undefined || body.description === null ? '' : body.description;
  const descriptionError = validateStringField(description, {
    name: 'description',
    min: 0,
    max: FIELD_LIMITS.description.max,
  });
  if (descriptionError) return descriptionError;

  const deckError = validateDeckJson(body.deck_json);
  if (deckError) return deckError;

  const ruleError = validateRuleJson(body.rule_json);
  if (ruleError) return ruleError;

  const compositionError = validateDeckComposition(body.deck_json, body.rule_json);
  if (compositionError) return compositionError;

  return null;
}

export function validateDeckJson(deckJson) {
  if (!deckJson || typeof deckJson !== 'object' || Array.isArray(deckJson)) {
    return 'deck_json must be an object';
  }

  for (const key of ['leader', 'rituals', 'main']) {
    const arrayError = validateStringArray(deckJson[key], `deck_json.${key}`);
    if (arrayError) return arrayError;
  }

  if (deckJson.leader.length > DECK_LIMITS.leader) {
    return `deck_json.leader must have at most ${DECK_LIMITS.leader} card`;
  }
  if (deckJson.rituals.length > DECK_LIMITS.rituals) {
    return `deck_json.rituals must have at most ${DECK_LIMITS.rituals} cards`;
  }
  if (deckJson.main.length > DECK_LIMITS.main) {
    return `deck_json.main must have at most ${DECK_LIMITS.main} cards`;
  }

  const allIds = [...deckJson.leader, ...deckJson.rituals, ...deckJson.main];
  if (allIds.length > DECK_LIMITS.total) {
    return `deck must have at most ${DECK_LIMITS.total} cards`;
  }

  const seen = new Set();
  for (const id of allIds) {
    if (!cardIds.has(id)) return `Unknown card id: ${id}`;
    if (seen.has(id)) return `Duplicate card id: ${id}`;
    seen.add(id);
  }

  return null;
}

export function validateRuleJson(ruleJson) {
  if (!ruleJson || typeof ruleJson !== 'object' || Array.isArray(ruleJson)) {
    return 'rule_json must be an object';
  }

  if (ruleJson.type !== 'rule1' && ruleJson.type !== 'rule2') {
    return 'rule_json.type must be "rule1" or "rule2"';
  }

  if (typeof ruleJson.primary !== 'string' || !factions.has(ruleJson.primary)) {
    return 'rule_json.primary must be a valid faction name';
  }

  if (typeof ruleJson.secondary !== 'string') {
    return 'rule_json.secondary must be a string';
  }

  if (ruleJson.type === 'rule1') {
    if (ruleJson.secondary !== '') {
      return 'rule_json.secondary must be empty for rule1';
    }
  } else if (!factions.has(ruleJson.secondary)) {
    return 'rule_json.secondary must be a valid faction name for rule2';
  } else if (ruleJson.secondary === ruleJson.primary) {
    return 'rule_json.secondary must differ from primary for rule2';
  }

  return null;
}

export function validateGuestbookSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be an object';
  }

  const authorError = validateStringField(body.author_name, {
    name: 'author_name',
    min: FIELD_LIMITS.authorName.min,
    max: FIELD_LIMITS.authorName.max,
  });
  if (authorError) return authorError;

  const messageError = validateStringField(body.message, {
    name: 'message',
    min: FIELD_LIMITS.guestbookMessage.min,
    max: FIELD_LIMITS.guestbookMessage.max,
  });
  if (messageError) return messageError;

  return null;
}

export function validateStatusPatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be an object';
  }
  if (typeof body.status !== 'string') {
    return 'status must be a string';
  }
  return null;
}

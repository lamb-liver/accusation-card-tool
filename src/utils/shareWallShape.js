const DECK_KEYS = ['leader', 'rituals', 'main'];

/**
 * @param {unknown} deckJson
 * @returns {string | null} 錯誤訊息；合法則 null
 */
export function validateApiDeckJson(deckJson) {
  if (!deckJson || typeof deckJson !== 'object' || Array.isArray(deckJson)) {
    return '牌組資料格式錯誤';
  }

  for (const key of DECK_KEYS) {
    if (!Array.isArray(deckJson[key])) {
      return `deck_json.${key} 必須為陣列`;
    }
    if (!deckJson[key].every((id) => typeof id === 'string' && id.length > 0)) {
      return `deck_json.${key} 必須為非空字串陣列`;
    }
  }

  return null;
}

/**
 * @param {unknown} ruleJson
 * @returns {string | null}
 */
export function validateApiRuleJson(ruleJson) {
  if (!ruleJson || typeof ruleJson !== 'object' || Array.isArray(ruleJson)) {
    return '規則資料格式錯誤';
  }
  if (ruleJson.type !== 'rule1' && ruleJson.type !== 'rule2') {
    return 'rule_json.type 不合法';
  }
  if (typeof ruleJson.primary !== 'string') {
    return 'rule_json.primary 不合法';
  }
  if (typeof ruleJson.secondary !== 'string') {
    return 'rule_json.secondary 不合法';
  }
  return null;
}

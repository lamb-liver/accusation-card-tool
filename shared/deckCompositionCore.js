/**
 * 構築規則核心（前端組牌器 + 後端投稿驗證共用）。
 * 修改此檔時請同步跑 test-deck.mjs 與 test:share-wall。
 */

export const DECK_COMPOSITION_LIMITS = {
  maxLeader: 1,
  maxRituals: 3,
  maxMain: 20,
  maxTotal: 24,
  rule2PrimaryMain: 12,
  rule2SecondaryMain: 8,
};

/**
 * @param {Partial<{ isActive?: boolean, type?: string, primary?: string, secondary?: string }> | null | undefined} rule
 */
export function normalizeRuleForComposition(rule) {
  if (!rule || typeof rule !== 'object') {
    return { isActive: false, type: 'rule1', primary: '', secondary: '' };
  }
  const type = rule.type === 'rule2' ? 'rule2' : 'rule1';
  const isActive = 'isActive' in rule ? Boolean(rule.isActive) : true;
  return {
    isActive,
    type,
    primary: typeof rule.primary === 'string' ? rule.primary : '',
    secondary: type === 'rule2' && typeof rule.secondary === 'string' ? rule.secondary : '',
  };
}

/**
 * @param {{ faction: string, type: string }} card
 * @param {ReturnType<typeof normalizeRuleForComposition>} rule
 */
export function checkSpecialCardFaction(card, rule) {
  if (card.faction !== rule.primary) return `${card.type}必須與主要教團相同`;
  return null;
}

/**
 * @param {{ id: string, name?: string, faction: string, type: string }} card
 * @param {ReturnType<typeof normalizeRuleForComposition>} rule
 */
export function getMainDeckFactionViolation(card, rule) {
  if (!rule.isActive) return null;
  if (card.type === '教主' || card.type === '儀式') return null;
  if (card.faction === '放逐者') return null;

  const label = card.name || card.id;

  if (rule.type === 'rule2' && !rule.secondary && card.faction !== rule.primary) {
    return `主牌組含非「${rule.primary}」教團的牌：${label}（次要教團尚未設定）`;
  }

  if (rule.type === 'rule2' && rule.secondary && card.faction !== '放逐者') {
    if (card.faction !== rule.primary && card.faction !== rule.secondary) {
      return '不能加入第三教團的牌';
    }
  }

  if (rule.type === 'rule1' && card.faction !== rule.primary && card.faction !== '放逐者') {
    return `主牌組只能使用「${rule.primary}」的卡牌`;
  }

  return null;
}

/**
 * @param {{ main: Array<{ faction: string }> }} deck
 * @param {ReturnType<typeof normalizeRuleForComposition>} rule
 */
export function getRule2MainQuotaViolations(deck, rule) {
  const issues = [];
  if (!rule.isActive || rule.type !== 'rule2' || !rule.secondary) return issues;

  const primaryCount = deck.main.filter((c) => c.faction === rule.primary).length;
  const secondaryCount = deck.main.filter((c) => c.faction === rule.secondary).length;
  if (primaryCount > DECK_COMPOSITION_LIMITS.rule2PrimaryMain) {
    issues.push(`${rule.primary} 主牌超過 12 張`);
  }
  if (secondaryCount > DECK_COMPOSITION_LIMITS.rule2SecondaryMain) {
    issues.push(`${rule.secondary} 主牌超過 8 張`);
  }
  return issues;
}

/**
 * @param {{
 *   leader: Array<{ id: string, name?: string, faction: string, type: string }>,
 *   rituals: Array<{ id: string, name?: string, faction: string, type: string }>,
 *   main: Array<{ id: string, name?: string, faction: string, type: string }>,
 * }} deck
 * @param {Parameters<typeof normalizeRuleForComposition>[0]} rule
 */
export function collectDeckStructureViolations(deck, rule) {
  const normalizedRule = normalizeRuleForComposition(rule);
  const limits = DECK_COMPOSITION_LIMITS;
  const issues = [];

  if (deck.leader.length > limits.maxLeader) issues.push('教主超過 1 張');
  if (deck.rituals.length > limits.maxRituals) issues.push('儀式超過 3 張');
  if (deck.main.length > limits.maxMain) issues.push('主牌組超過 20 張');

  const total = deck.leader.length + deck.rituals.length + deck.main.length;
  if (total > limits.maxTotal) {
    issues.push(`牌組總張數超過 24（目前 ${total} 張）`);
  }

  const seen = new Set();
  for (const card of [...deck.leader, ...deck.rituals, ...deck.main]) {
    const label = card.name || card.id;
    if (seen.has(card.id)) issues.push(`重複卡牌：${label}`);
    seen.add(card.id);
  }

  for (const card of deck.leader) {
    if (card.type !== '教主') issues.push(`教主欄位含非教主卡：${card.name || card.id}`);
  }
  for (const card of deck.rituals) {
    if (card.type !== '儀式') issues.push(`儀式欄位含非儀式卡：${card.name || card.id}`);
  }
  for (const card of deck.main) {
    if (card.type === '教主' || card.type === '儀式') {
      issues.push(`主牌組不可含${card.type}：${card.name || card.id}`);
    }
  }

  if (!normalizedRule.isActive) return issues;

  for (const card of [...deck.leader, ...deck.rituals]) {
    const err = checkSpecialCardFaction(card, normalizedRule);
    if (err) {
      issues.push(
        `${card.type}「${card.name || card.id}」須屬於主要教團「${normalizedRule.primary}」`,
      );
      break;
    }
  }

  for (const card of deck.main) {
    const err = getMainDeckFactionViolation(card, normalizedRule);
    if (err) {
      issues.push(err);
      break;
    }
  }

  issues.push(...getRule2MainQuotaViolations(deck, normalizedRule));
  return issues;
}

/**
 * @param {ReturnType<typeof collectDeckStructureViolations>} issues
 */
export function formatDeckCompositionError(issues) {
  return issues.length > 0 ? issues.join('；') : null;
}

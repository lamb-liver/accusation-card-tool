import { VALID_RULE_TYPES } from './constants.js';
import { normalizeImportedRule } from './normalizeImportedRule.js';
import {
  cardHasAlternateArt,
  getCardArtVariants,
  getCardImageFullSrc,
  getStoredArtVariant,
} from '../utils/cardAlternateArt.js';

export { normalizeImportedRule };

/** 匯入 JSON 各欄位 ID 數量上限（高於合法牌組上限，用於拒絕惡意超大陣列） */
const MAX_IMPORT_SECTION_LENGTH = 32;

export function validateImportedJson(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return '不是有效的 JSON 物件';
  if (typeof json.version !== 'number') return '缺少 version 欄位';
  if (!json.deck || typeof json.deck !== 'object') return '缺少 deck 欄位';

  const { leader, rituals, main } = json.deck;
  if (!Array.isArray(leader) || !Array.isArray(rituals) || !Array.isArray(main)) {
    return 'deck 結構不正確（leader / rituals / main 必須為陣列）';
  }

  if (
    leader.length > MAX_IMPORT_SECTION_LENGTH ||
    rituals.length > MAX_IMPORT_SECTION_LENGTH ||
    main.length > MAX_IMPORT_SECTION_LENGTH
  ) {
    return `deck 陣列過長（各欄位最多 ${MAX_IMPORT_SECTION_LENGTH} 個 ID）`;
  }

  if (json.rule !== undefined && json.rule !== null) {
    if (typeof json.rule !== 'object' || Array.isArray(json.rule)) return 'rule 欄位格式不正確';
    if (json.rule.type !== undefined && !VALID_RULE_TYPES.includes(json.rule.type)) {
      return `rule.type 必須是 ${VALID_RULE_TYPES.join(' 或 ')}`;
    }
  }

  return null;
}

/** @param {import('../types.js').Card[]} allCards */
function buildCardLookup(allCards) {
  const byId = new Map();
  const byName = new Map();
  for (const card of allCards) {
    byId.set(card.id, card);
    if (!byName.has(card.name)) byName.set(card.name, card);
  }
  return { byId, byName };
}

export function createDeckFromJsonIds(deckJson, allCards) {
  const missingIds = [];
  const { byId } = buildCardLookup(allCards);

  /** @param {string[]} ids */
  function resolveSection(ids) {
    const cards = [];
    for (const id of ids) {
      const card = byId.get(id);
      if (card) {
        cards.push(card);
      } else {
        missingIds.push(id);
      }
    }
    return cards;
  }

  return {
    deck: {
      leader: resolveSection(deckJson.leader),
      rituals: resolveSection(deckJson.rituals),
      main: resolveSection(deckJson.main),
    },
    missingIds,
  };
}

/**
 * 從匯出行解析卡牌：支援 `名稱（id）` 與舊版 `名稱（教團）`／`名稱（id／教團 / 類型）`。
 * @param {string} name
 * @param {string} parenInner 括號內全文（不含尾括號）
 * @param {Map<string, import('../types.js').Card>} byId
 * @param {Map<string, import('../types.js').Card>} byName
 */
function resolveCardFromExportLine(name, parenInner, byId, byName) {
  const trimmedName = name.trim();
  const firstSegment = parenInner.split('／')[0].trim();
  if (byId.has(firstSegment)) return byId.get(firstSegment);
  return byName.get(trimmedName) ?? null;
}

export function createDeckFromText(text, allCards) {
  const lines = text.split('\n');
  const newDeck = { leader: [], rituals: [], main: [] };
  let section = '';
  const { byId, byName } = buildCardLookup(allCards);

  for (let line of lines) {
    line = line.trim();

    // 卡牌行優先判定：卡名可能含「儀式」等字樣（如「逆向儀式」），不可誤判為段落標題
    if (/^[··]\s*/.test(line)) {
      if (!section) continue;
      const match = line.match(/[··]\s*(.+?)（([^）]*)/);
      if (match) {
        const card = resolveCardFromExportLine(match[1], match[2], byId, byName);
        if (card) newDeck[section].push(card);
      }
      continue;
    }

    if (line.startsWith('教主')) section = 'leader';
    else if (line.startsWith('儀式')) section = 'rituals';
    else if (line.startsWith('主牌組')) section = 'main';
  }

  return newDeck;
}

export function buildDeckTextExport(deck, currentRule) {
  const total = deck.leader.length + deck.rituals.length + deck.main.length;
  const ruleLabel = currentRule.type === 'rule2'
    ? `雙教團（主：${currentRule.primary}／次：${currentRule.secondary}）`
    : `單教團（${currentRule.primary}）`;

  let text = `【控訴】牌組清單\n構築規則：${ruleLabel}\n總張數：${total}/24\n═══════════════════\n`;

  if (deck.leader.length) {
    text += `\n教主（${deck.leader.length}/1）\n${deck.leader.map((card) => `  · ${card.name}（${card.id}）`).join('\n')}\n`;
  }
  if (deck.rituals.length) {
    text += `\n儀式（${deck.rituals.length}/3）\n${deck.rituals.map((card) => `  · ${card.name}（${card.id}）`).join('\n')}\n`;
  }
  if (deck.main.length) {
    text += `\n主牌組（${deck.main.length}/20）\n${deck.main.map((card) => `  · ${card.name}（${card.id}／${card.faction} / ${card.type}）`).join('\n')}\n`;
  }

  text += '\n═══════════════════\n（由「控訴-卡牌查詢與組牌」匯出）';
  return text;
}

export function buildDeckJsonExport(deck, currentRule) {
  return {
    version: 2,
    rule: currentRule,
    deck: {
      leader: deck.leader.map((card) => card.id),
      rituals: deck.rituals.map((card) => card.id),
      main: deck.main.map((card) => card.id),
    },
  };
}

export async function exportDeckAsImage(deck, _currentRule, showToast) {
  const allDeckCards = [...deck.leader, ...deck.rituals, ...deck.main];
  if (allDeckCards.length === 0) {
    showToast('牌組是空的，沒有可以匯出的內容', 'warning');
    return;
  }

  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute',
    top: '-9999px',
    left: '-9999px',
    width: '840px',
    padding: '24px',
    backgroundColor: '#1a1a1a',
    fontFamily: 'sans-serif',
  });

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);gap:8px;';

  const promises = allDeckCards.map(
    (card) =>
      new Promise((resolve) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText =
          'aspect-ratio:3/4;overflow:hidden;border-radius:6px;background:#333;position:relative;';

        const img = document.createElement('img');
        const variant = cardHasAlternateArt(card)
          ? getStoredArtVariant(card.id, getCardArtVariants(card))
          : 'main';
        img.src = getCardImageFullSrc(card.id, variant);
        img.crossOrigin = 'anonymous';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';

        img.onload = () => resolve(wrapper);
        img.onerror = () => resolve(wrapper);

        wrapper.appendChild(img);
        grid.appendChild(wrapper);
      }),
  );

  container.appendChild(grid);
  document.body.appendChild(container);

  try {
    await Promise.all(promises);
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#1a1a1a',
      logging: false,
      useCORS: true,
    });

    const link = document.createElement('a');
    link.download = 'accusation_deck.png';
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast('牌組圖片已下載');
  } catch (error) {
    console.error(error);
    showToast('匯出圖片失敗，請重新整理後再試', 'error');
  } finally {
    document.body.removeChild(container);
  }
}

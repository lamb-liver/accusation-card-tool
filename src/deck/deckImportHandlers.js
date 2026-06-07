import { getDeckTotal, validateDeckComposition } from './rules.js';
import {
  buildDeckJsonExport,
  buildDeckTextExport,
  createDeckFromJsonIds,
  createDeckFromText,
  exportDeckAsImage,
  normalizeImportedRule,
  validateImportedJson,
} from './importExport.js';

/** 匯入貼上內容長度上限，避免超大 JSON 卡住主線程 */
const MAX_IMPORT_TEXT_LENGTH = 512_000;

/**
 * @typedef {Object} DeckControllerCtx
 * @property {import('../types.js').Card[]} allCards
 * @property {(message: string, type?: import('../types.js').ToastType) => void} showToast
 * @property {(message: string, opts?: object) => Promise<boolean>} showConfirm
 * @property {(message: string, opts?: object) => Promise<string|null>} showPrompt
 */

/**
 * @typedef {Object} DeckImportHandlersDeps
 * @property {() => { deck: import('../types.js').Deck, currentRule: import('../types.js').DeckRule }} getState
 * @property {DeckControllerCtx} ctx
 * @property {(patch: object) => boolean} commit
 */

/**
 * @param {DeckImportHandlersDeps} deps
 */
export function createDeckImportHandlers({ getState, ctx, commit }) {
  async function importDeck() {
    const text = await ctx.showPrompt('貼上牌組清單（文字或 JSON 格式）：', {
      title: '匯入牌組',
      placeholder: '貼上 JSON 備份或文字清單…',
      multiline: true,
    });

    if (!text?.trim()) return;
    if (text.length > MAX_IMPORT_TEXT_LENGTH) {
      ctx.showToast('匯入內容過長，請縮短後再試', 'error');
      return;
    }

    try {
      const json = JSON.parse(text);
      if (json.deck && json.version) {
        const schemaErr = validateImportedJson(json);
        if (schemaErr) {
          ctx.showToast(`匯入失敗：${schemaErr}`, 'error');
          return;
        }

        const ok = await ctx.showConfirm('匯入 JSON 牌組備份，目前牌組將被覆蓋，確定嗎？', {
          title: '匯入確認',
          confirmLabel: '匯入覆蓋',
          danger: true,
        });
        if (!ok) return;

        const { deck: newDeck, missingIds } = createDeckFromJsonIds(json.deck, ctx.allCards);
        const { currentRule } = getState();
        const normalizedRule = json.rule ? normalizeImportedRule(json.rule) : currentRule;
        const composition = validateDeckComposition(newDeck, normalizedRule);
        if (!composition.valid) {
          ctx.showToast(`匯入失敗：${composition.reason}`, 'error');
          return;
        }

        let imported;
        if (json.rule) {
          imported = commit({
            deck: newDeck,
            currentRule: normalizedRule,
            primaryFaction: normalizedRule.primary,
            secondaryFaction: normalizedRule.secondary,
          });
        } else {
          imported = commit({ deck: newDeck });
        }
        if (!imported) return;

        const total = getDeckTotal(newDeck);
        if (missingIds.length > 0) {
          ctx.showToast(
            `JSON 匯入完成，共 ${total} 張（${missingIds.length} 個 ID 無法對應已略過）`,
            'warning',
          );
        } else {
          ctx.showToast(`JSON 匯入成功！共 ${total} 張卡牌`);
        }
        return;
      }
    } catch {
      // 非 JSON，改走文字格式解析
    }

    try {
      const newDeck = createDeckFromText(text, ctx.allCards);
      const total = getDeckTotal(newDeck);
      if (total === 0) {
        ctx.showToast('找不到任何卡牌，請確認格式是否正確', 'error');
        return;
      }
      const composition = validateDeckComposition(newDeck, getState().currentRule);
      if (!composition.valid) {
        ctx.showToast(`匯入失敗：${composition.reason}`, 'error');
        return;
      }
      if (!commit({ deck: newDeck })) return;
      ctx.showToast(`文字匯入成功！共 ${total} 張卡牌`);
    } catch (error) {
      ctx.showToast('匯入失敗，格式錯誤', 'error');
      console.error(error);
    }
  }

  function exportAsText() {
    const { deck, currentRule } = getState();
    const total = getDeckTotal(deck);
    if (total === 0) {
      ctx.showToast('牌組是空的，沒有可以匯出的內容', 'warning');
      return;
    }

    const text = buildDeckTextExport(deck, currentRule);
    navigator.clipboard
      .writeText(text)
      .then(() => ctx.showToast('牌組清單已複製到剪貼簿'))
      .catch(() => ctx.showToast('複製失敗，請手動複製', 'error'));
  }

  function exportAsJson() {
    const { deck, currentRule } = getState();
    const total = getDeckTotal(deck);
    if (total === 0) {
      ctx.showToast('牌組是空的，沒有可以匯出的內容', 'warning');
      return;
    }

    const data = buildDeckJsonExport(deck, currentRule);
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 2))
      .then(() => ctx.showToast('JSON 備份已複製到剪貼簿'))
      .catch(() => ctx.showToast('複製失敗，請手動複製', 'error'));
  }

  async function exportDeckAsImageHandler() {
    const { deck, currentRule } = getState();
    await exportDeckAsImage(deck, currentRule, ctx.showToast);
  }

  return {
    importDeck,
    exportAsText,
    exportAsJson,
    exportDeckAsImage: exportDeckAsImageHandler,
  };
}

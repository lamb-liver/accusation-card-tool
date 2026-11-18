#!/usr/bin/env node
/**
 * 確認 QA 分頁清單涵蓋 FACTION_ORDER，且沒有未知分類。
 * 純本地檢查，不連 Google Sheets。
 */
import { SHEETS, assertFactionCoverage } from './lib/qa-sheets.mjs';

try {
  assertFactionCoverage();
  console.log(`check-qa-sheets: ok（${SHEETS.length} 分頁與 FACTION_ORDER 一致）`);
} catch (error) {
  console.error(`check-qa-sheets: ${error.message}`);
  process.exit(1);
}

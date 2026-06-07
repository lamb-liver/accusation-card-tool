# 分享牆 / 留言板 — Phase 2 前端規格

## 組牌投稿 UI

使用 `DeckSubmitModal` 單一表單（非 `window.prompt()`），含欄位長度驗證與取消按鈕。投稿前仍會在開啟 modal 前檢查構築規則與 `validateDeckComposition`。

## API 錯誤

`shareWallApi.js` 統一將非 2xx 的 `{ error }` 轉為 `ShareWallApiError`；`useAsyncResource` / toast 直接顯示 `error.message`。

## 載入分享牌組

`loadShareWallDeckIntoBuilder` 在 `setDeck` 前依序檢查：

1. `validateApiDeckJson` / `validateApiRuleJson`（shape guard）
2. `createDeckFromJsonIds`
3. `validateDeckComposition`

## 列表錯誤重試

`AsyncPanel` 的 error 狀態附「重新載入」按鈕，綁定 `useAsyncResource().reload`。

## Admin 操作後

`approve` / `hidden` / `deleted` 成功後自動 `reload()` 列表（維持目前篩選）；並 toast「狀態已更新」。

## Hash 與 Tab 同步

`#/decks` 與 `#/decks/<shareId>` 皆將 `currentMode` 設為 `share`，分享牆 tab 會高亮。初始載入亦從 hash 解析 mode，避免閃爍。

## 路由

| 路徑 | 畫面 |
|------|------|
| 分享牆 tab | 公開牌組列表 |
| `#/decks/<shareId>` | 單副牌詳情 + 載入組牌器 |
| 留言板 tab | 投稿表單 + 公開留言 |
| `#/admin` | 管理後台（不在 tab 列，需手動輸入 hash） |

## `reviewed_at` 語意（公開列表）

後端 `reviewed_at` 代表**最後一次管理狀態變更時間**，每次 admin `PATCH .../status` 成功都會覆寫為當下時間。

公開列表 `GET /api/decks`、`GET /api/guestbook` 依 `reviewed_at DESC, created_at DESC` 排序。

### 前端顯示建議

- 若 UI 顯示時間欄位，標籤請用「**最後核准時間**」或「**更新時間**」，**不要**用「上架時間」或「投稿時間」（後者應對應 `created_at`，目前公開 API 未用 `created_at` 排序）。
- 一筆內容若經歷 `hidden → approved`，重新核准後會因 `reviewed_at` 更新而**回到列表頂端**；此行為為預期，非 bug。

### Admin 列表

Admin `GET /api/admin/submissions` 依 `created_at DESC` 排序（投稿時間），`reviewed_at` 僅供顯示最後審核動作時間。

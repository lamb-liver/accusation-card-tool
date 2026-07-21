# 全庫程式碼審查（2026-07-22）

分支：`fix/review-hardening`

這份文件記錄一次完整的人工審查：**看過哪些檔案、發現什麼、修了什麼、什麼沒修以及為什麼**。
目的是讓下一次審查能從這裡接手，不必重新掃一遍全庫。

---

## 1. 審查範圍

### 已逐行讀過

**後端（`functions/`）— 100%**

| 檔案 | 檔案 |
| --- | --- |
| `_shared/auth.js` | `_shared/statusMachine.js` |
| `_shared/validation.js` | `_shared/statusPatch.js` |
| `_shared/rateLimit.js` | `_shared/publicListCache.js` |
| `_shared/origin.js` | `_shared/submissionBody.js` |
| `_shared/request.js` | `_shared/constants.js` |
| `_shared/response.js` | `_shared/deckComposition.js` |
| `_shared/db.js` | `_shared/shareId.js` |
| `_shared/turnstile.js` | |
| `api/decks.js` | `api/admin/login.js` |
| `api/decks/[shareId].js` | `api/admin/logout.js` |
| `api/guestbook.js` | `api/admin/submissions.js` |
| `api/admin/decks/[id].js` | `api/admin/decks/[id]/status.js` |
| `api/admin/messages/[id]/status.js` | |

**共用規則層**：`shared/deckCompositionCore.js`

**前端（`src/`）— 100%**

- 進入點／型別：`main.jsx`、`App.jsx`、`types.js`
- 規則層：`rules/`（index、normalizeRule、deckBuildValidity、deckPoolDisplay）
- 牌組領域層：`deck/`（createDeckController、deckAddHandlers、deckImportHandlers、importExport、rules、deckCompositionRules、normalizeImportedRule、savedDecks、sortMainDeck、storage、persistedState、shareWallHandlers、constants）
- Hooks：`useDeck`、`useCardData`、`useCardFilters`、`useAsyncResource`、`useHashRoute`、`useCardModal`、`useCommunityDeckFlow`、`useDialog`、`useToast`、`usePagination`、`useGridColumnCount`、`usePageTitle`
- API client：`api/shareWallApi.js`
- Utils：全部 18 個檔案
- 元件：全部（Card、CardGallery、CardModal、DeckBuilder + `deckBuilder/` 9 個、admin 2 個、community、shareWall 3 個、guestbook、common 3 個、FilterToolbar、MobileFilterDrawer、PaginationControls、QASection、DialogContainer、ToastList、AppFooter、AppPageBackground、AppErrorBoundary、BackToTopButton）
- Clock 功能：`ClockPage.jsx`、`useGameClock.js`、`clockEngine.js`、`clockUtils.js`
- Constants：`factionOrder`、`filterOptions`、`qaPlaceholder`、`appBackground`、`symbols`、`mechanicGlossary`

**基礎設施**：`vite.config.js`、`wrangler.toml`、`config/csrf.json`、`migrations/`（3 個 .sql）

### 未逐行讀，僅做針對性掃描

| 對象 | 處理方式 | 理由 |
| --- | --- | --- |
| `scripts/*.mjs`（24 個，約 3700 行） | 掃 `child_process` / `exec` / `process.env` / 破壞性指令用法 | 建置與測試工具，不進 production bundle；掃描未見可疑用法 |
| `src/index.css`、`ClockPage.css`（約 1200 行） | 未審查 | 純樣式，本次聚焦正確性與安全性 |
| `src/data/qaData.js`、`cardNames.generated.js` | 只看結構與頭尾 | 由 `sync-qa` / `generate-*` 自動產生的資料 |
| `functions/_shared/*.generated.js` | 只確認產生來源 | 自動產生 |
| `public/cards.json`、圖片資產 | 未審查 | 資料與二進位資產 |

### 驗證方式

- `npm run lint` — 通過
- `npm test`（7 個套件）— 全數通過
- `npm run validate:repo` — 通過
- `npm run build` — 成功，PWA service worker 正常產生
- 新增測試以「刻意反轉斷言」確認確實會執行並失敗，再還原

---

## 2. 整體評價

品質高於一般同規模專案。特別值得保留的設計：

- **規則單一真相源**：`shared/deckCompositionCore.js` 同時被前端與後端 import；張數上限由 `DECK_COMPOSITION_LIMITS` 反推到後端 `constants.js`，前後端驗證不會漂移。
- **分層防護**：Origin 檢查 + 自訂 CSRF header + Turnstile + rate limit + 狀態機轉移限制，`deleted` 為終態。全部 SQL 使用 bind 參數。
- **無 XSS 面**：全庫無 `dangerouslySetInnerHTML` / `innerHTML` / `eval`。
- **localStorage 寫入具回滾**（`deck/storage.js`），配額耗盡不會留下半套狀態。
- **領域層可測**：`createDeckController` 不依賴 React；`clockEngine` 為純 reducer。
- **註解說明「為什麼」而非「做什麼」**，多處記錄了取捨與踩過的坑。

---

## 3. 本次已修（皆在 `fix/review-hardening`）

| # | 問題 | 位置 | 修法 |
| --- | --- | --- | --- |
| 1 | Rate limit 的 IP 來源可偽造：`X-Forwarded-For` 由客戶端控制，每次換值即可讓 rate limit 失效（含 admin login 暴力破解上限）；`'unknown'` 共用桶則讓任何人能少量請求鎖死端點 | `_shared/rateLimit.js` | 只信任 `CF-Connecting-IP`；production 取不到即 403，本機走固定 key |
| 2 | Admin 密碼以 `!==` 比對，短路行為可經時序側通道洩漏前綴 | `api/admin/login.js` | 新增 `timingSafeEqual`（雙方 SHA-256 後逐 byte XOR 累積） |
| 3 | `resolveRequestId` 在無 `X-Request-Id` 時每次產生新 UUID，被呼叫兩次 → 日誌記的 id 與回應標頭不同，機制形同失效 | `api/decks.js`、`api/guestbook.js` 等 8 支端點 | 新增 `createResponder(request)`，一個 request 只解析一次；移除舊的 `apiResponse` |
| 4 | 多處 D1 查詢為裸 `await`，失敗時回平台預設 500（無 `{ error }` 形狀、無 `X-Request-Id`） | guestbook INSERT、4 支列表/詳情查詢、`statusPatch` 的 3 次查詢 | 新增 `runDbQuery(scope, requestId, operation)` 統一包裝 |
| 5 | `json.version` 用 truthiness 判斷，`version: 0` 會靜默掉進文字解析分支 | `deck/deckImportHandlers.js` | 改為 `typeof === 'number'` |
| 6 | 匯出圖片時卡圖只靠 `onload`/`onerror` resolve，兩者皆不觸發則 `Promise.all` 永遠 pending，離屏容器永久留在 DOM | `deck/importExport.js` | 加 10 秒逾時保險 |
| 7 | `useCardData` 的 `retry` 無 staleness guard，連按時舊請求會覆蓋新結果 | `hooks/useCardData.js` | 加 `requestIdRef`（比照 `useAsyncResource` 既有作法） |

另補上三組回歸測試至 `scripts/test-share-wall.mjs`：`timingSafeEqual`、`createResponder` 的 id 一致性、`runDbQuery` 的錯誤轉換。

---

## 4. 已知但未修

### 4.1 `useCardModal` 未 memo 化，使多處 `useCallback` 失效（建議優先處理）

`hooks/useCardModal.js` 回傳的 `handleCardClick`、`closeModal`、`handleModalPrev`、`handleModalNext` 都是每次 render 重建的普通函式。連鎖影響：

- `App.jsx` 的 `handleGalleryCardClick` 掛著註解「穩定識別：inline 箭頭會在每次 render 打破 CardGallery/Card 的 memo」，但它依賴 `handleCardClick`，所以每次 render 仍然變動 —— `CardGallery` / `Card` 的 `memo` 實際上沒有生效。`DeckPoolSection` 有同樣註解與同樣問題。
- `CardModal` 中鎖定 body 捲動的 effect 依賴 `[card, onClose]`，`onClose` 每次變動會導致 effect 反覆解除／重掛 keydown listener 並重設 `body.style.overflow`。

修法：在 `useCardModal` 內以 `useCallback` 包裝四個回傳函式（`handleModalPrev`/`handleModalNext` 需改用 functional state update 以避免依賴 `selectedCard`）。

### 4.2 `usePagination` 只在結果「數量」改變時重置頁碼

`hooks/usePagination.js` 的 effect 比較 `filteredCards.length`。若切換篩選後結果數量恰好相同（例如兩個教團各 24 張），使用者會停在舊頁碼而非回到第 1 頁。影響輕微但確實可重現。

### 4.3 OFFSET 分頁在資料變動時會漏項或重複

公開列表、留言板、admin 列表都使用 `LIMIT ? OFFSET ?`。審核動作或新投稿會讓後續頁位移。低流量下可接受；要根治需改 cursor 分頁（`created_at < ?`），但會變更 API 契約 —— `docs/project-state.md` 明確要求不在無關工作中改動 share-wall 契約，故未動。

### 4.4 `AdminSection` 的 `reload()` 會丟棄已載入的分頁

狀態變更後呼叫 `reload()`，列表回到第一頁，先前按「載入更多」取得的項目消失。UX 層面的小問題。

### 4.5 `statusPatch.js` 的表名字串插值

`SELECT ... FROM ${table}` 無法用 bind 參數化。目前安全：`table` 來自寫死的 `TABLES` 白名單，`kind` 只由本模組呼叫端以字面量傳入。本次已加註解說明此前提，提醒未來新增呼叫端時不可讓 `kind` 來自請求資料。

---

## 5. 給下一次審查的提示

- 本次未涵蓋：CSS（約 1200 行）、`scripts/` 的逐行邏輯、`public/cards.json` 的資料正確性。
- 自動產生的檔案（`*.generated.js`、`qaData.js`）不要直接改，找對應的 `scripts/` 產生器。
- 動到 `shared/deckCompositionCore.js` 時，務必同時跑 `npm run test:deck` 與 `npm run test:share-wall`（該檔頂部註解也有標示）。
- share-wall 全棧（前端元件 → `api/shareWallApi.js` → `functions/api/` → `migrations/`）屬受保護區域，非該主題的任務不應改動其請求／回應契約。

# accusation-v2 手機優先分析報告

產出日期：2026-06-01  
分析目標：依手機優先分析規格建立可執行的優化候選清單；本輪不做產品功能優化。

## Executive Summary

- 390px 與 430px 是本輪主力斷點；768px 僅做補充驗證。
- 基礎測試與 production build 通過，現有 domain 層對牌組規則、卡牌目錄、牌組儲存降級已有測試覆蓋。
- 手機查卡與組牌初始版面在 390px、430px、768px 沒有偵測到水平 overflow。
- PWA offline reload 在已完成一次線上載入與 Service Worker ready 後可重載並顯示 102 張卡。
- 手機 UI 匯入流程有 P0 風險：舊格式文字匯入使用單行 prompt，換行會被壓成空白，導致舊格式無法成功解析。
- 同一輪 UI journey 觀察到 JSON 匯出後再匯入顯示「0 張（1 個 ID 無法對應已略過）」，需列為 P0 候選並優先複驗；domain tests 仍通過，表示問題可能在 UI journey / clipboard / saved deck round-trip 其中一層。
- `test:deck-layout` 目前是測試基礎設施缺口：preview server 可找到，但專案 Playwright browser 未安裝，測試不能在本機一條指令完成。

## Evidence

原始截圖與 `results.json` 是一次性驗證產物，已不常駐 repo；本文件保留當輪文字摘要。

## Verified Baseline

Commands run:

- `npm run lint`：通過。
- `npm run test:rule-engine`：通過，rule2 pool counts 為 `{ primary: 24, secondary: 20, exile: 6 }`。
- `npm run test:card-catalog`：通過。
- `npm run test:deck`：通過；測試中刻意觸發 `QuotaExceededError`，controller 以降級路徑處理並通過。
- `npm run test:gallery-layout`：通過。
- `npm run build`：通過，`dist/sw.js` 有產出。

Build chunk baseline:

- `vendor-html2canvas`: 199.57 kB, gzip 46.78 kB.
- `vendor-react-core`: 178.26 kB, gzip 55.95 kB.
- `index`: 81.90 kB, gzip 27.07 kB.
- CSS: 58.61 kB, gzip 11.23 kB.
- PWA precache: 17 entries, 1073.94 KiB.

Known test infrastructure gap:

- `npm run test:deck-layout` 在沒有 server 時會正確回報需要先啟動 dev/preview。
- 啟動 `npm run preview -- --host 127.0.0.1` 後，外部權限下的測試可找到 `http://localhost:4173`。
- 測試仍失敗於 Playwright browser 缺失：`Executable doesn't exist at ... chromium_headless_shell...`。
- 這是測試流程缺口，不視為產品功能 bug。

## Mobile Journey Results

### 390px

Status:

- 查卡頁載入 102 張卡，無水平 overflow。
- 進入組牌頁，無水平 overflow。
- 可套用單教團規則並選擇鴉教團。
- 可搜尋並加入 `黑色葬禮`、`群鴉風暴`。
- 可開啟「隱藏已選」。
- 可展開 bottom sheet 查看牌組，當時顯示 2/24。
- 可從牌組移除 `黑色葬禮`。
- 可儲存牌組並在 reload 後看到 saved deck 名稱。
- JSON 匯出可寫入 clipboard，且 clipboard 內容可解析為 JSON。
- 舊格式文字匯入失敗，輸入值中的換行被壓成空白。
- After-import 截圖顯示 JSON 匯入 toast 為 `JSON 匯入完成，共 0 張（1 個 ID 無法對應已略過）`，並接著顯示舊格式匯入錯誤。

### 430px

Status:

- 結果與 390px 一致。
- 查卡、組牌初始版面、bottom sheet、儲存與 reload 都可完成。
- 無水平 overflow。
- 舊格式文字匯入同樣失敗。
- JSON round-trip 同樣觀察到匯入後 0 張且 1 個 ID 無法對應。

### 768px

Status:

- 補充驗證通過。
- 組牌頁無水平 overflow。
- 只確認平板/窄桌面不明顯退化，未和 390/430 平均分配分析權重。

## Offline And Data Reliability

390px offline run:

- Cold cache style run：全新 browser context 首次訪問可載入 102 張卡。
- Warm cache run：正常載入一次後 reload，仍可顯示 102 張卡。
- Offline reload：等待 Service Worker ready 後設為 offline，再 reload，仍可顯示 102 張卡。
- `offlineError`: `null`。
- `requestFailures`: 空陣列。
- `horizontalOverflow`: false。

限制：

- 這次是 headless Chrome + preview server 的實測，不等同真機安裝 PWA 後的主畫面啟動。
- 手機鍵盤遮擋無法由 headless Chrome 完整代表，仍需真機或實機瀏覽器確認。

## Optimization Candidates

### [P0] 舊格式文字匯入在手機 UI 無法穩定完成

- Evidence：當輪手機 journey 文字摘要。
- Repro：進入組牌頁 -> 儲存/載入任一牌組 -> 點擊「匯入牌組」-> 貼上含換行的舊格式文字清單 -> 確定。
- Impact：Required Mobile Deck Journey 第 13 步失敗；舊格式匯入屬於資料可靠性與相容性路徑。
- Observed：dialog input value 變成 `【控訴】牌組清單 儀式（1/3）   · 黑色葬禮（鴉教團）`，換行未保留；UI toast 顯示找不到任何卡牌。
- Success Criteria：
  - 390px 可貼上舊格式多行文字並成功匯入。
  - 430px 可貼上舊格式多行文字並成功匯入。
  - 舊格式匯入後牌組張數與卡名正確。
  - 不影響 JSON 匯入。
  - `npm run test:deck` 通過，並新增/補 UI 或 handler 測試覆蓋多行輸入。
- Non-goal：不重新設計整個 dialog 系統；不重做桌面版。

### [P0] JSON 匯出再匯入的手機 UI round-trip 觀察到資料不一致

- Evidence：當輪手機 journey 文字摘要。
- Repro：390px 或 430px -> 組牌 -> 套用鴉教團規則 -> 加入兩張卡 -> 移除一張 -> 儲存 -> reload -> 載入 saved deck -> 匯出 JSON -> 立刻匯入剛才的 JSON。
- Impact：Required Mobile Deck Journey 第 11、12 步資料一致性風險；若真實使用者遇到，屬於匯入匯出錯誤。
- Observed：JSON 可解析，但 UI toast 顯示 `JSON 匯入完成，共 0 張（1 個 ID 無法對應已略過）`；最終牌組顯示 0/24。
- Important Context：`npm run test:deck` 已通過 text export/import round-trip、JSON validation、storage quota fallback；因此修復前需先定位是 UI clipboard、saved deck load、automation timing，還是 import handler 的使用情境缺口。
- Success Criteria：
  - 390px 匯出後立即匯入，牌組張數與卡牌 ID 完全一致。
  - 430px 匯出後立即匯入，牌組張數與卡牌 ID 完全一致。
  - 匯入成功 toast 顯示正確張數，且沒有 missing ID。
  - 相關 domain tests 通過，並補一個 UI round-trip 或 controller integration 測試。
- Non-goal：不改 JSON schema，除非定位證明現有 schema 無法支援。

### [P1] 手機 dialog / bottom sheet 需要補真機鍵盤驗收

- Evidence：headless run 可驗證 bottom sheet 展開、內部內容與基本點擊；無法驗證真機鍵盤。
- Repro：390px 或 430px 真機 -> 開啟組牌 bottom sheet -> 聚焦搜尋、牌組名稱、匯入 prompt。
- Impact：若鍵盤遮住輸入框或確認按鈕，會阻礙儲存與匯入流程。
- Success Criteria：
  - 手機鍵盤彈出後不遮住主要輸入框與確認按鈕。
  - bottom sheet 內部滾動不帶動背景誤滾。
  - dialog 關閉後頁面位置不跳到頂部。
  - 390px、430px 都可完成 Required Mobile Deck Journey。
- Non-goal：不調整桌面 dialog 視覺細節。

### [P2] 卡牌資料 preload warning 需判斷是否可接受

- Evidence：第一輪 390px/430px journey 曾出現 Chrome warning：`cards/cro.json was preloaded using link preload but not used within a few seconds from the window's load event`。
- Repro：全新 mobile context 開啟查卡頁並觀察 console warning。
- Impact：目前未造成流程失敗，也未出現 request failure；屬於待驗證效能/噪音問題。
- Success Criteria：
  - 若保留 preload，確認 warning 不代表錯誤的 `as` 或載入時序。
  - 若移除或調整 preload，不使冷啟動查卡變慢。
  - Lighthouse 不退步超過既定門檻。
- Non-goal：不重新設計卡牌分片策略。

### [P2] `test:deck-layout` 需要一條指令可跑完

- Evidence：`npm run test:deck-layout` 在 server 未啟動時正確失敗；server 啟動後又因 Playwright browser 缺失失敗。
- Repro：`npm run build` -> `npm run preview -- --host 127.0.0.1` -> `npm run test:deck-layout`。
- Impact：版面回歸測試存在，但本地/CI 若沒有額外安裝 browser 就無法穩定執行。
- Success Criteria：
  - `npm run test:deck-layout` 可在 preview server 已啟動時穩定通過；或
  - 新增 wrapper script 自動啟動 preview、等待服務可用、執行測試、關閉 server。
  - README 或 CI 文件明確說明 browser 安裝或執行方式。
- Non-goal：不把測試基礎設施問題當成產品功能 bug。

## Accepted / No Immediate Action

- 390px、430px、768px 初始查卡/組牌版面未偵測到水平 overflow。
- Offline reload 在 headless preview 測試中可顯示卡牌資料。
- Lighthouse 已視為完成優化；本輪未重跑追分，只保留回歸門檻。
- 桌面微調與純視覺細節不進入本輪修復。

## Lighthouse Regression Threshold

後續若有產品修改，只有符合以下條件才列為 Lighthouse 回歸問題：

- Performance 分數下降超過 10 分。
- CLS 明顯惡化並造成可見 layout shift。
- INP / TBT 顯著惡化，且手機實測有操作卡頓。
- LCP 明顯退步，且影響首次查卡或組牌入口。

## Recommended Next Order

1. 先複驗並修正 P0 匯入/匯出路徑：舊格式多行 prompt 與 JSON UI round-trip。
2. 補一個能重現手機 UI round-trip 的測試，避免 domain tests 通過但 UI 輸入層失效。
3. 處理 `test:deck-layout` 的 browser / wrapper 問題，讓版面回歸能穩定進 CI 或本地一條指令。
4. 用真機或實機瀏覽器補驗鍵盤遮擋、scroll lock、bottom sheet 背景誤滾。

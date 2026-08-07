# `accusation-card-tool` 專案演進復盤與工作手冊

日期：2026-08-08

分析範圍：`70d571e`（2026-05-03）至 `origin/main` 的 `6efd140`（2026-08-03）

## 先說結論

這個專案真正有價值的進步，不是功能數量變多，而是逐步從「把能跑的成品直接放進 Git」變成「有單一資料來源、可重建、可驗證、可安全部署的產品」。

目前主架構是健康的：156 張卡直接載入與瀏覽器篩選、React PWA、Cloudflare Pages Functions + D1、共用牌組規則與一組完整的 repository validation，均符合現有規模。現在最該做的不是再重構，而是修正文檔與流程漂移、刪除確定不用的第二部署路徑、替暫時相容碼設定退場條件。

## 證據範圍與限制

- 檢視了遠端主線全部 138 個提交：109 個非 merge、29 個 merge。
- Git 歷史沒有 tag；共有 36 個提交只用 `vX.Y.Z` 當訊息，但 `package.json` 一直是 `0.0.0`。
- 本機 `main` 已 fast-forward 至 `origin/main@6efd140`；該次同步只改 `src/data/qaData.js`。
- 2026-08-08 修正文檔並移除 legacy offset 後，重新執行完整 validation；結果記錄於本文件末段。
- Git 能證明「改了什麼、何時又被改回」，不能完整還原當時動機。下文把明確反轉與事後判斷分開，不把猜測寫成事實。

## 從一開始到現在

### 第一階段：靜態查卡 MVP（2026-05-03～05-10）

起點是 `index.html`、`script.js`、`style.css`、`cards.json`、規則 PDF 與 JPG 卡圖。很快完成三件正確的事：

- 把公開檔整理進 `public/`。
- 將 JPG 轉為 WebP，先處理最大宗的載入成本。
- 加入查卡、篩選與資料取得流程，證明產品核心需求成立。

這一階段的價值是快速驗證「玩家需要查卡」；問題則是原始碼、部署成品與素材邊界尚未建立，`.DS_Store` 也進了版控。

### 第二階段：行動端、PWA 與部署成品時期（2026-05-11～05-28）

`16aadda` 開始明確改善手機 UI，之後加入分頁、篩選順序、異畫、Lighthouse 調整與 PWA 資產。這些使用體驗方向大致正確，但 repo 當時主要追蹤 hash 命名的 JS/CSS bundle、`sw.js`、Workbox、`.br`、`.gz` 等建置產物。

結果是每次小改都造成大量檔案更名與二進位 churn。`v1.0.1`、`v1.0.2`、`v1.0.3` 等提交看似是版本節點，實際上沒有 tag，也沒有對應 package version，回頭很難知道每個版本真正交付了什麼。

`eea389a` 與 `617771e` 開始把部署責任轉向自動化，這是往正確方向走，但真正完成「source first、build output 不進 Git」是在下一階段。

### 第三階段：Vite/React 與 Cloudflare 全棧化（2026-06-08）

`1902e45` 是最大轉折：加入完整 `src/`、Vite、React、測試與維護 scripts，也加入 Cloudflare Pages Functions、D1 migrations、Turnstile、CSRF、rate limit、管理員流程與前後端共用牌組規則；同時移除 repo 內的舊 build output。

這次遷移一次增加 201 個檔案與約 2.4 萬行，風險很高，但方向正確：

- 原始碼成為真實來源，`dist/` 可重建。
- 牌組規則從畫面邏輯中抽離，前後端能共享驗證。
- 分享牆、留言與管理介面有明確安全邊界。
- 維護工作開始有 scripts 與 tests，不再靠人工記憶。

同時也帶進幾項尚未用規模證明的複雜度：卡牌目錄分片、自訂 CLI、額外 preload／worker／版面監控輔助碼。後續的歷史證明，其中一部分值得保留，一部分被刪掉。

### 第四階段：功能擴張後開始刪除（2026-06-09～06-19）

這段加入交流區、每週 QA 同步、對局時鐘、先後手硬幣、管理端整理與更多測試。產品能力成形，同時第一次明顯出現「先加、再發現重複或不必要」：

- `4a9a81c` 新增 `ToolsPage`、骰子、硬幣、計時 placeholder，共 467 行。
- 10 分鐘後的 `982d4d7` 幾乎完整刪除，因為硬幣與計時已存在於 `#/clock`。
- `9757654`、`77b01a3` 又刪除自訂 dropdown wrapper、LCP helper、card filter worker、版面 invariant monitor、Web Vitals helper 與一次性 evidence。

這不是「刪越多越好」，而是專案開始辨認哪些抽象真的承擔產品責任。現行 `docs/project-state.md` 正是為了避免再次重做 clock／coin／tool route 而留下。

早期手機分析列出的多行匯入與 JSON round-trip P0，現在已不是現存 bug：匯入使用 `textarea`、保留換行，domain tests 也覆蓋文字 round-trip 與 JSON ID 匯入成功。歷史報告應保留作為證據，但不能當成目前待辦。

### 第五階段：功能變成產品，審查變成流程（2026-07-15～07-23）

逐光者／禁忌廚房擴充後，開發方式從版本字樣提交轉向小範圍 feature branch、PR 與 Conventional Commits。主要改善包括：

- 規則 normalization 與牌組上限收斂到單一真相源。
- 篩選、分頁、卡片編號、異畫、modal swipe、回頂部、IME、組牌排序與 compact mode。
- QA 搜尋／教團篩選、卡片到 QA 的連結。
- URL 保存篩選與 modal 狀態，裸網址不再被錯誤改寫。
- Error Boundary、cache/preload、request ID、D1 錯誤形狀與測試可靠性。
- Rate limit 只信任 Cloudflare IP、管理員密碼改為 timing-safe compare。
- 列表改用 keyset cursor，避免資料插入／審核時 OFFSET 漏項或重複。

這段最重要的進步是「先找共同根因，再一次修在共用層」。但也發生 `rules.pdf` 被部署清理誤刪，`d1d92f8` 才恢復並補上資產防退化檢查。教訓不是不能自動清理，而是清理必須由引用清單與 validation 保護。

### 第六階段：量測後簡化與視覺收斂（2026-07-25～08-03）

對 156 張卡實測後，`731bf21` 將分片卡牌目錄回歸單一 `/cards.json`，並做全庫整理：83 個檔案、增加 638 行、刪除 1,276 行。單檔約 51 KB、gzip 約 7 KB，瀏覽器同步篩選已足夠；分片、manifest request、預壓縮 shard 與維護腳本只增加失敗面。

視覺則在同一天連續經過三次提交：

- `75c98c4`：整理 gallery art direction。
- `3b0e0e7`：把卡背圖降對比作為全頁背景。
- `a10d536`：10 分鐘後改成純 CSS 深色羊皮紙，並移除未使用背景資產。

最後結果比原本乾淨，也保住手機與組牌辨識；但三個 PR 在 23 分鐘內連續替換，顯示視覺驗收條件應在動手前說清楚：背景不能與卡圖搶焦、gallery 可減資訊、deck pool 不可丟失構築訊號、390px 必須實測。

`2ac1645` 修正 QA generator 的 locale Unicode 空白，`6efd140` 證明每週自動同步已能安全產生並推送內容。

## 已完成、應保留的優化

| 面向 | 已完成的改善 | 為什麼值得保留 |
| --- | --- | --- |
| 資料 | `public/cards.json` 是唯一卡牌來源，generated manifest 由它產生 | 156 張卡不需要分片或搜尋服務 |
| 圖片 | WebP／AVIF、160／320／640 responsive variants、首屏 preload | 圖片才是實際流量大宗；這是有量測依據的複雜度 |
| 規則 | `shared/deckCompositionCore.js` 與規則層由前後端共用 | 防止前端可加、後端不收或反向漂移 |
| 狀態 | deck controller、localStorage rollback、import/export tests | 直接保護玩家牌組資料，不應為了少檔案硬拆掉 |
| 後端 | Origin／CSRF／Turnstile／rate limit／admin HMAC／輸入驗證 | 都在 trust boundary，不能用「簡化」移除 |
| 分頁 | 變動列表使用 cursor + 唯一 tiebreaker | 解決真實的漏項／重複問題；不是單純追求效能 |
| PWA | Workbox cache 與 source-first build | 保留離線查卡，同時避免追蹤 build output |
| 驗證 | `npm run validate:repo` 集中檢查資產、generated、lockfile、部署、lint、tests | 已多次攔住資產遺失與生成資料漂移 |
| UI | gallery 與 deck pool 分開看待、modal 提供觸控 fallback | 共用 `Card`，不能用桌面 hover 或作品集式極簡破壞組牌 |
| 流程 | 2026-07 起以小分支、PR、Cloudflare check 後 merge | 相較早期版本字樣提交，更容易審查與回復 |

## 走過的彎路與判斷錯誤

### 已由 Git 明確證明的反轉

| 判斷 | 證據 | 問題 | 已採取的修正 |
| --- | --- | --- | --- |
| 把部署 bundle、`.br`、`.gz` 當成主要版控內容 | 5 月大量 hash 檔更名；6 月 source migration 才移除 | diff 噪音高、難 code review、容易漏檔 | `dist/` ignored，從 source build；靜態 artifact 流程後續也已移除 |
| 用 `vX.Y.Z` 當提交訊息即可代表 release | 36 個 version-only commits、0 tag、package version 固定 `0.0.0`，且版本曾倒退 | 無法知道內容、無可靠 rollback 節點 | 7 月後改用 Conventional Commits；仍需補正式 release 規則 |
| 新增獨立 Tools 頁處理硬幣與計時 | `4a9a81c` +467，10 分鐘後 `982d4d7` -467 | 未先搜尋既有 `#/clock` | 留下 `docs/project-state.md` 與 pre-change search |
| 156 張卡需要 JSON 分片 | `1902e45` 引入，`731bf21` 移除 | 51 KB 資料卻增加多 request、cache、壓縮檔與 scripts | 回到單一 `/cards.json` |
| 清理公開輸出時可依眼前 build 判斷必要資產 | `rules.pdf` 被刪，`d1d92f8` 恢復 | 靜態引用鏈與使用者入口沒有被 gate 保護 | 資產檢查與 deploy-flow validation |
| locale 顯示字串可直接寫入 generated source | QA workflow 因 narrow no-break space lint fail | 本機與 CI locale 輸出不完全一致 | 在 generator 統一 whitespace，不手改產物 |
| 卡背圖適合作為長期頁面背景 | `3b0e0e7` 後 10 分鐘由 `a10d536` 替換 | 即使低對比仍與卡圖爭焦，也多出資產依賴 | 改用純 CSS 深色羊皮紙並刪無用背景 |

### 不是錯誤，但決策成本曾被低估

- **一次完成 v2 全棧遷移**：方向正確，但單次提交太大，若當時拆成「source build」「backend」「PWA/assets」「tests」會更容易定位回歸。
- **keyset pagination**：對低流量不是效能必需品，卻解決了審核與新投稿造成的資料一致性問題，所以現在不該拔掉。應移除的是已過期的 offset 相容分支，不是 cursor 本身。
- **自訂 project CLI 與 validation scripts**：數量看起來多，但已承擔跨平台 native binding、server lifecycle、資產與部署 gate。只有在某條命令沒有 caller、CI 或維護用途時才刪。
- **大量 responsive 圖片**：目前追蹤 1,497 個 `public/images` 檔，會增加 repo 體積；但卡圖是產品本體。先避免無意義重建與全量 staging，除非 clone/push 已實際成為瓶頸，否則不要重寫 Git 歷史或導入 LFS。

### 工作方法上的誤判

- 曾把「專案 review」錯當成只看 `HEAD^..HEAD`，因此只提出一個小刪除；使用者追問後才做 whole-repo audit。以後要先明定 review scope。
- 曾用 `networkidle` 等待 PWA browser validation，長連線／Service Worker 使流程卡住。此專案用 `load`、DOM snapshot 與具體 responsive assertion 比較可靠。
- 曾把 sandbox 內 `gh auth status` 失敗當成帳號問題；應先區分 sandbox network／keyring context，再判定真實登入狀態。

## 現在回頭看，應修正什麼

### 已修正：讓文件重新成為真相

2026-08-08 已完成：

1. README 的 QA 維護改為執行 generator，明確禁止手改 `src/data/qaData.js`。
2. `docs/project-state.md` 改為單一 `public/cards.json`，並更新日期。
3. 中英文 README 的 clone／結構目錄改為 `accusation-card-tool`。
4. 靜態 artifact 流程已完整刪除，不再產生 `deploy-output/`。
5. 2026-07-22 code review 保留歷史內容，但補上 legacy offset 已完成清理的註記。

### 已完成：刪除靜態 deploy artifact 流程

刪除前，文件說 Cloudflare Pages 直接連本 repo 是 production source；但 `scripts/sync-deploy.mjs` 又指示把 `deploy-output` 用 GitHub Desktop 推到「Cloudflare 連結的 repo」，`deploy.yml` 也在每次 main push 建一份靜態 artifact。

| 選擇 | 優點 | 缺點 |
| --- | --- | --- |
| 保留 | 每次 main 都有可下載的靜態 snapshot；不需要部署憑證；可做純前端預覽 | 重跑 build／validation、消耗 Actions 時間與 artifact 空間；不含 Functions、D1、binding、migration，不能當完整 production 備份；`sync-deploy.mjs` 還會誤導人手動推第二個 repo |
| 刪除 | Cloudflare Git integration 成為唯一真實路徑；少一個 workflow、命令、同步 script 與自我檢查；不再有「artifact 等於備份／部署」的誤會 | 少了可直接下載的靜態 snapshot；Cloudflare 以外的純前端預覽要臨時執行 `npm run build` |

**決策：刪除。** 現有 artifact 只備份靜態檔，無法復原完整 Pages Functions + D1 服務，提供的保障低於它帶來的維護與認知成本。

2026-08-08 已刪除 `.github/workflows/deploy.yml`、`scripts/sync-deploy.mjs`、`build:deploy` 與 project CLI 對應分支，也移除 `deploy-output` 的 ignore／lint 特例。`check:deploy-flow` 保留但縮小成 canonical gate：只驗證 Cloudflare Pages／D1 設定，並阻止上述舊路徑被重新加入。

### 已完成：legacy offset 相容碼退場

確認舊前端不再影響現行專案後，2026-08-08 已移除 `parseOffsetParam`、`LIMIT ? OFFSET ?`、`tailBind` 與 legacy tests。現行 frontend 原本就只送 cursor，因此不改變目前查卡交流區、留言板或管理列表的請求；cursor、migration 與唯一排序鍵完整保留。

### P1：整理 Git 工作狀態

- 本機 `main` 已 fast-forward 到 `origin/main@6efd140`。
- `codex/refine-card-back-background` 與 `codex/preview-parchment-background` 已合併；確認不再需要後，刪除本機與遠端分支。
- repo 有 4,383 個 loose objects、約 179 MiB；只有 Git 操作實際變慢時再執行維護，不要為了數字先做 LFS migration 或重寫歷史。

### P2：停止「假版本」，建立最小 release 規則

最省事的規則：

- 平常只用 Conventional Commits：`feat:`、`fix:`、`refactor:`、`docs:`、`chore:`。
- 只有需要對外辨識或回復時才建立 annotated tag。
- 不再用單獨的 `v2.1.1` 當 commit message。
- 若產品不需要公開 semver，就讓 `package.json` 保持 private／`0.0.0`，不要同時假裝有另一套版本。

## 以後照這個方式工作

### 1. 開工前

```bash
git status --short --branch
git fetch --prune
git pull --ff-only
```

然後只做三件事：

1. 用一句話寫清楚使用者問題與驗收結果。
2. `rg` 搜尋既有 route、元件、hook、script、中文 UI 文案與 caller。
3. 決定這次是唯讀審查、修 bug、功能、內容更新或發布；不要混成一個大提交。

### 2. 選方案時

依序停在第一個能成立的答案：

1. 真的需要做嗎？
2. repo 已有相同能力嗎？
3. 平台原生能力能處理嗎？
4. 已安裝 dependency 能處理嗎？
5. 最少要改哪些檔？

本 repo 特別要先問：

- 新工具是否已在 `src/features/clock/`？
- 新卡片 UI 是否同時影響 gallery 與 deck pool？
- 要改的是 source 還是 generated output？
- 這是 156 張卡的真需求，還是在為假想規模設計？

### 3. 依工作類型走固定路徑

| 工作 | 正確入口 | 最小驗證 |
| --- | --- | --- |
| 卡牌文字 | 改 `public/cards.json`，再跑 `npm run cards:manifest` | `npm run validate:repo` |
| QA | 跑／修 `scripts/sync-qa.mjs` 與 formatter，不手改 `qaData.js` | `node scripts/check-qa-sync-safety.mjs` + `npm run validate:repo` |
| 圖片 | 放 master WebP，再跑 `npm run optimize:images` | assets check + build；只 stage 目標卡 |
| 規則 | `src/rules/`／`shared/deckCompositionCore.js` | rule、deck、share-wall tests |
| UI | 先確認共用 caller，實測 desktop 與 390px | `validate:repo`、build、`validate:browser` |
| API／D1／安全 | 沿 frontend → API → shared helper → migration 追完整流 | `validate:repo`；需要時跑 integration |
| 文件 | 只改已核對的現況，歷史報告標日期 | `git diff --check` |
| 發布 | Cloudflare Pages 為 canonical；精準 stage、PR、等 check、merge | merge 後 main 與 origin 同步 |

### 4. 修 bug 時

1. 先取得 exact error、環境、commit 與 caller。
2. generated 檔出錯就修 generator。
3. 多個 caller 都會遇到就修共同函式。
4. 留一個最小可執行回歸檢查。
5. 不把測試環境／權限錯誤誤報成產品 bug。

### 5. UI 工作時

- 先確認 workflow 與真實狀態，再調 spacing、字體、顏色與質感。
- gallery 可以降低 metadata 噪音；deck pool 必須保留教團、類型、符號與數值線索。
- hover 不能是唯一資訊入口；鍵盤 focus、tap/modal、`prefers-reduced-motion` 都要保留。
- 每一輪視覺改動先定 acceptance：卡片辨識、篩選效率、組牌操作、390px overflow。
- 背景只負責氣氛，不應成為第二張卡圖。

### 6. 提交與合併前

```bash
git diff --check
git status --short
git diff --cached --stat
```

- 一個提交只承擔一個意圖。
- 不 stage 無關 untracked 檔或全量 regenerated 圖片。
- 不 commit `dist/`、`.DS_Store`、`.br`、`.gz` build artifacts，也不重新引入已退役的 `deploy-output/`。
- 大改用 PR；等 Cloudflare Pages check 通過再 merge。
- merge 後 fast-forward 本機 main，刪除已完成分支。

## 不要再做的事

- 不為 156 張卡加入 Redis、KV、Durable Objects、queue、SSR、搜尋服務或全域 state library。
- 不新增第二套 coin、timer、card filter、modal、deployment path。
- 不直接修改 `*.generated.js` 或 `qaData.js`。
- 不因「程式碼看起來多」就刪除 trust-boundary security、資料回滾或回歸測試。
- 不用 version-only commit 取代清楚的變更描述。
- 不在沒有使用證據、效能量測或退場條件時加入抽象與相容層。

## 下一輪最小行動清單

1. 清理已合併分支。
2. 若需要正式 release，再建立 annotated tag；否則維持 Conventional Commits 即可。

完成以上項目後，先停止架構優化。下一步應由真實玩家問題、production log 或失敗測試驅動。

## 2026-08-08 本輪驗證

- `rg` 確認現行 frontend／backend／tests 已無 `parseOffsetParam`、`tailBind` 或 `LIMIT ? OFFSET ?` 執行路徑；只保留 cursor 文件中解釋 OFFSET 缺陷的歷史文字。
- `npm run test:share-wall -- --integration`：通過，實際驗證 Wrangler + 本機 D1 的第一頁與 cursor 後續頁。
- `npm run validate:repo`：通過，包含資產、generated、lockfile、Cloudflare-only deploy gate、lint 與全部核心測試。
- `npm run build:ci`：通過，Vite production build 與 PWA service worker 正常產生。
- 已刪除 static deploy artifact workflow、同步 script 與 command；Cloudflare Pages Git integration 是唯一部署路徑。

## 關鍵提交索引

| Commit | 意義 |
| --- | --- |
| `70d571e` | 初始靜態站與卡圖 |
| `689d782` | 整理至 `public/` |
| `ad0f776` | WebP 圖片 |
| `16aadda` | 行動端 UI 與 PWA 成品 |
| `617771e` | GitHub Actions 部署自動化起點 |
| `1902e45` | Vite/React source、Cloudflare Functions/D1、tests |
| `d75aed1` | QA automation、community、clock |
| `4a9a81c` → `982d4d7` | 重複 Tools 頁新增後立刻撤回 |
| `77b01a3` | 移除多個不必要 helper／worker／監控 |
| `4c3403d`、`cb31a0e` | correctness cleanup 與規則單一來源 |
| `d1d92f8` | 恢復誤刪 `rules.pdf` 並補防護 |
| `43e5d66` | 全庫安全性、可靠性與 memo 修正 |
| `6f82e36` | cursor pagination |
| `c64951d` | URL state 與符號統計 |
| `731bf21` | 單一 cards catalog 與全庫簡化 |
| `75c98c4`、`3b0e0e7`、`a10d536` | gallery／背景方向快速收斂 |
| `2ac1645` | QA locale whitespace root-cause fix |
| `6efd140` | 最新自動 QA 同步 |

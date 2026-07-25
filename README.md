# 控訴（accusation）

《控訴》Living Card Game 的**卡牌查詢、篩選與牌組構築**輔助 Web App（PWA）。可在瀏覽器使用，安裝後支援離線查卡與組牌。

> 本工具為玩家社群輔助用途，卡牌圖像與遊戲內容版權屬原權利人所有。

## 功能概覽

| 模式 | 說明 |
|------|------|
| **查卡** | 關鍵字、教團、類型、符號、機制等多條件篩選；分頁瀏覽；點擊開啟大圖與完整效果 |
| **組牌** | 教主／儀式／主牌組分欄；構築規則（單教團、雙教團配額）；拖曳排序主牌；隱藏已選 |
| **常見問題** | 內建 QA，可摺疊瀏覽 |
| **交流區** | 留言板、公開牌組投稿與管理員審核 |
| **對局時鐘** | 雙方倒數、回合切換與行動次數 |
| **匯出** | 文字清單、JSON 備份、牌組截圖（html2canvas） |
| **異畫** | 支援異畫的卡可切換主圖／異畫（偏好存於 `localStorage`） |

### 進階能力

- **卡牌目錄**：單一 `public/cards.json`（目前約 51 KB／gzip 約 7 KB）；瀏覽器與 Workbox 快取重複請求
- **篩選效能**：156 張卡直接同步篩選；查卡列表以分頁控制渲染量
- **組牌卡池**：單一卡池 scroll 容器，避免整頁與卡池雙層搶捲動
- **圖片**：AVIF / WebP 響應式 `srcset`（160 / 320 / 640）；首屏 LCP 卡圖 HTML preload
- **PWA**：Workbox 快取靜態資源、卡牌 JSON 與圖片；`autoUpdate` Service Worker

## 技術棧

- [Vite](https://vite.dev/) 8 · [React](https://react.dev/) 19 · [Tailwind CSS](https://tailwindcss.com/) 4
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)（Workbox）
- [sortablejs](https://sortablejs.github.io/Sortable/) · [lucide-react](https://lucide.dev/)
- 建置期圖片處理：[sharp](https://sharp.pixelplumbing.com/)
- Cloudflare Pages Functions · D1 · Turnstile

## 環境需求

- **Node.js** 20+（建議 LTS）
- **npm** 10+

## 快速開始

```bash
git clone <repo-url>
cd accusation-v2

npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build        # 產出 dist/
npm run preview      # 預覽 dist/（預設 http://localhost:4173）
```

需要連同 Pages Functions／D1 測試時：

```bash
npm run d1:migrations:apply:local
npm run cf:dev       # 建置後以 Wrangler 啟動完整站點
```

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 本機開發伺服器 |
| `npm run build` | 正式建置至 `dist/` |
| `npm run build:ci` | 建置並檢查 PWA `sw.js`（CI） |
| `npm run build:deploy` | 建置後同步至 `deploy-output/` |
| `npm run preview` | 預覽建置結果 |
| `npm run validate:repo` | 資產、generated 檔、lockfile、部署流程、lint 與核心測試總檢查 |
| `npm run validate:browser` | 啟動或使用既有本機站台，跑組牌版面與水平溢位檢查 |
| `npm run lint` | ESLint |
| `npm run check:assets` | 檢查目前引用鏈需要的 `public/` 資產是否齊全 |
| `npm run check:generated` | 檢查 generated 檔是否與來源資料同步 |
| `npm run check:lockfile` | 檢查 `package-lock.json` 是否與 `package.json` 對齊 |
| `npm run check:public-orphans` | 列出 `public/` 未被目前引用鏈使用的檔案 |
| `npm run clean:public-orphans` | dry-run 顯示可安全清理的 `public/` 檔案；加 `-- --apply` 才會刪除 |
| `npm run check:deploy-flow` | 檢查部署 workflow、`wrangler.toml` 與 `sync-deploy` 的高風險設定 |
| `npm run doctor:build-env` | 診斷本機 Node/Vite/Rolldown native binding 狀態 |
| `npm run test:rule-engine` | 構築規則單元測試 |
| `npm run test:card-catalog` | 卡牌目錄載入測試 |
| `npm run test:deck` | 牌組領域模組測試 |
| `npm run test:utils` | 路由、篩選、卡片 metadata、分享牆 API client 等純工具測試 |
| `npm run test:deck-layout` | 組牌模式 viewport／scroll 容器 Playwright 斷言（需先啟動 dev 或 preview server） |
| `npm run audit:deck-layout` | 組牌版面詳細 dump（除錯用） |
| `npm run optimize:images` | 由 master WebP 產生 `-w160` / `-w320` / `-w640` 的 WebP、AVIF |
| `npm run fonts:display` | 由卡名＋標題文案重建展示用襯線字體子集 `public/fonts/*.woff2` |
| `npm run check:pwa-sw` | 檢查 `dist/sw.js` 是否存在 |
| `npm run cf:dev` | 建置並啟動 Cloudflare Pages Functions + 本機 D1 |
| `npm run d1:migrations:apply:local` | 套用 D1 migrations 至本機資料庫 |

## 專案結構

```
accusation-v2/
├── public/
│   ├── cards.json          # 唯一卡牌目錄來源
│   ├── images/             # 卡圖與符號圖示（含響應式 -w* 變體）
│   ├── fonts/              # 展示用襯線字體子集（Noto Serif TC，SIL OFL）＋ OFL.txt
│   └── favicon.svg
├── functions/              # Cloudflare Pages Functions API
├── migrations/             # D1 schema 與索引
├── shared/                 # 前後端共用構築規則核心
├── scripts/                # 建置、測試、部署、資料腳本
├── src/
│   ├── App.jsx             # 殼層：模式切換、資料 hooks、lazy 區塊
│   ├── components/         # UI（Card、CardGallery、FilterToolbar、deckBuilder/…）
│   ├── deck/               # 牌組領域（controller、storage、importExport）
│   ├── rules/              # 構築規則（展示篩選 vs 加入合法性）
│   ├── hooks/              # useCardData、useDeck 等
│   ├── utils/              # cardCatalog、篩選、圖片、LCP preload
│   ├── constants/          # 篩選選項、符號、背景主題
│   └── data/               # qaData.js
├── index.html              # LCP preload、PWA manifest 連結
├── vite.config.js          # PWA 與 build 設定
├── wrangler.toml           # Pages output 與 D1 binding
└── package.json
```

## 架構備註

- **`src/rules/deckPoolDisplay.js`**：組牌池「顯示哪些卡」（例如 rule2 隱藏次要教團的教主／儀式）
- **`src/rules/deckBuildValidity.js`**：點擊加入時的合法性（教團、配額、對話框）
- **`src/deck/createDeckController.js`**：牌組狀態與 UI 回呼的集中入口；`useDeck` 為薄適配層
- **圖片常數**：`src/utils/cardAlternateArt.js` 的 `CARD_IMAGE_WIDTHS` 須與 `scripts/optimize-images.mjs` 同步

## 環境變數

純前端查卡／組牌不需要環境變數。啟用交流區寫入與管理功能時需設定：

| 變數 | 用途 |
|------|------|
| `ALLOWED_ORIGINS` | 允許送出留言、牌組與管理操作的來源（逗號分隔） |
| `ADMIN_PASSWORD` | 管理員登入密碼 |
| `ADMIN_SESSION_SECRET` | 管理員 cookie 的 HMAC secret |
| `VITE_TURNSTILE_SITE_KEY` | 前端 Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Pages Functions 驗證 Turnstile 的 secret |
| `ENVIRONMENT=production` | 啟用正式環境的 Turnstile、Secure cookie 與限流檢查 |

`REQUIRE_CSRF_HEADER=false`、`RATE_LIMIT_DISABLED=true` 僅供受控的本機除錯使用。

## 部署

完整站點應由 Cloudflare Pages 連接本 repo，build command 使用 `npm run build`、輸出目錄使用 `dist`；`functions/` 會作為 Pages Functions 部署，D1 binding 與 migrations 定義在 `wrangler.toml`／`migrations/`。

首次部署或 schema 更新後執行 `npm run d1:migrations:apply:remote`。`npm run build:deploy` 與 GitHub Actions 的 `deploy-output` artifact 只包含靜態輸出，適合備份或純前端預覽，不包含 Pages Functions。

`dist/` 與 `deploy-output/` 已在 `.gitignore`，不應 commit。

## 資料維護

1. **更新卡牌文字**  
   編輯唯一來源 `public/cards.json` → 執行 `npm run cards:manifest` → `npm run validate:repo`

2. **新增卡圖**  
   將 master 圖放入 `public/images/<id>.webp` → `npm run optimize:images` 產生響應式檔名

3. **構築規則**  
   修改 `src/rules/` 後執行 `npm run test:rule-engine`

   > 展示字體子集只涵蓋現有卡名與標題文案；新增卡牌後可執行 `npm run fonts:display`
   > 重建 `public/fonts/*.woff2` 並一併 commit（缺字會逐字回退，不會破版）。

4. **常見問題**  
   編輯 `src/data/qaData.js`

## 授權與免責

本工具為玩家社群輔助用途，卡牌圖像與遊戲內容版權屬原權利人所有。本倉庫僅提供工具原始碼，不提供卡牌素材的重散布授權。

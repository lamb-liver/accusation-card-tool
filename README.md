# 控訴（accusation-v2）

《控訴》Living Card Game 的**卡牌查詢、篩選與牌組構築**輔助 Web App（PWA）。可在瀏覽器使用，安裝後支援離線查卡與組牌。

> 本工具為玩家社群輔助用途，卡牌圖像與遊戲內容版權屬原權利人所有。

## 功能概覽

| 模式 | 說明 |
|------|------|
| **查卡** | 關鍵字、教團、類型、符號、機制等多條件篩選；分頁瀏覽；點擊開啟大圖與完整效果 |
| **組牌** | 教主／儀式／主牌組分欄；構築規則（單教團、雙教團配額）；拖曳排序主牌；隱藏已選 |
| **常見問題** | 內建 QA，可摺疊瀏覽 |
| **匯出** | 文字清單、JSON 備份、牌組截圖（html2canvas） |
| **異畫** | 支援異畫的卡可切換主圖／異畫（偏好存於 `localStorage`） |

### 進階能力

- **卡牌目錄**：`public/cards/` 分片 JSON + `index.json` 版本號；IndexedDB 快取，冷啟動先載入首個分片（`cro`）以縮短首屏
- **篩選效能**：卡牌數 ≥ 80 時以 Web Worker 過濾；查卡列表超過 24 張時啟用 `react-window` 虛擬列表
- **組牌卡池**：卡數 > 24 時一律虛擬化（含手機）；`flex` 版面鎖定 viewport，僅卡池／牌組欄內滾動
- **開發除錯**：組牌模式啟用 `useLayoutInvariant()`（dev only，違規時 console / overlay / 節點高亮）
- **圖片**：AVIF / WebP 響應式 `srcset`（160 / 320 / 640）；首屏 LCP 卡圖 HTML preload
- **PWA**：Workbox 快取靜態資源、卡牌 JSON 與圖片；`autoUpdate` Service Worker

## 技術棧

- [Vite](https://vite.dev/) 8 · [React](https://react.dev/) 19 · [Tailwind CSS](https://tailwindcss.com/) 4
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)（Workbox）· [vite-plugin-compression2](https://github.com/nonzzz/vite-plugin-compression)
- [react-window](https://github.com/bvaughn/react-window) · [sortablejs](https://sortablejs.github.io/Sortable/) · [lucide-react](https://lucide.dev/)
- 建置期圖片處理：[sharp](https://sharp.pixelplumbing.com/)

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

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 本機開發伺服器 |
| `npm run build` | 正式建置至 `dist/` |
| `npm run build:ci` | 建置並檢查 PWA `sw.js`（CI） |
| `npm run build:deploy` | 建置後同步至 `deploy-output/` |
| `npm run preview` | 預覽建置結果 |
| `npm run lint` | ESLint |
| `npm run test:rule-engine` | 構築規則單元測試 |
| `npm run test:card-catalog` | 卡牌目錄載入測試 |
| `npm run test:deck` | 牌組領域模組測試 |
| `npm run test:gallery-layout` | 卡池版面估算測試 |
| `npm run test:deck-layout` | 組牌模式 viewport／scroll 容器 Playwright 斷言 |
| `npm run audit:deck-layout` | 組牌版面詳細 dump（除錯用） |
| `npm run split:cards` | 將 `public/cards.json` 拆成 `public/cards/*.json` |
| `npm run optimize:images` | 由 master WebP 產生 `-w160` / `-w320` / `-w640` 的 WebP、AVIF |
| `npm run check:pwa-sw` | 檢查 `dist/sw.js` 是否存在 |

## 專案結構

```
accusation-v2/
├── public/
│   ├── cards.json          # 完整卡牌（split:cards 的來源，可選維護）
│   ├── cards/
│   │   ├── index.json      # 分片索引與 version
│   │   ├── cro.json        # 鴉教團等分片
│   │   └── …
│   ├── images/             # 卡圖與符號圖示（含響應式 -w* 變體）
│   └── favicon.svg
├── scripts/                # 建置、測試、部署、資料腳本
├── src/
│   ├── App.jsx             # 殼層：模式切換、資料 hooks、lazy 區塊
│   ├── components/         # UI（Card、CardGallery、FilterToolbar、deckBuilder/…）
│   ├── deck/               # 牌組領域（controller、storage、importExport）
│   ├── rules/              # 構築規則（展示篩選 vs 加入合法性）
│   ├── hooks/              # useCardData、useDeck、useLayoutInvariant 等
│   ├── dev/                # 僅開發建置（layout invariant 檢查）
│   ├── utils/              # cardCatalog、篩選、圖片、LCP preload
│   ├── workers/            # cardFilter.worker.js
│   ├── constants/          # 篩選選項、符號、背景主題
│   └── data/               # qaData.js
├── index.html              # LCP preload、PWA manifest 連結
├── vite.config.js          # chunk 分割、PWA、壓縮
└── package.json
```

## 架構備註

- **`src/rules/deckPoolDisplay.js`**：組牌池「顯示哪些卡」（例如 rule2 隱藏次要教團的教主／儀式）
- **`src/rules/deckBuildValidity.js`**：點擊加入時的合法性（教團、配額、對話框）
- **`src/deck/createDeckController.js`**：牌組狀態與 UI 回呼的集中入口；`useDeck` 為薄適配層
- **圖片常數**：`src/utils/cardAlternateArt.js` 的 `CARD_IMAGE_WIDTHS` 須與 `scripts/optimize-images.mjs` 同步

## 環境變數

目前**無必填**環境變數；卡牌與圖片皆由 `public/` 靜態提供。若日後新增，請使用 `VITE_` 前綴並更新 `.env.example`（見 [Vite 環境變數](https://vite.dev/guide/env-and-mode.html)）。

## 部署

本 repo 為**原始碼**。靜態站點建議流程：

1. `npm run build:deploy` — 建置 `dist/` 並複製到 `deploy-output/`
2. 將 `deploy-output/` 內容部署至靜態主機（例如 Cloudflare Pages 用的獨立 repo）

`dist/` 與 `deploy-output/` 已在 `.gitignore`，不應 commit 進原始碼 repo。

## 資料維護

1. **更新卡牌文字**  
   編輯 `public/cards.json`（或各分片 JSON）→ `npm run split:cards`（若改的是合併檔）→ 遞增 `public/cards/index.json` 的 `version`（觸發客戶端重新抓取）

2. **新增卡圖**  
   將 master 圖放入 `public/images/<id>.webp` → `npm run optimize:images` 產生響應式檔名

3. **構築規則**  
   修改 `src/rules/` 後執行 `npm run test:rule-engine`

4. **常見問題**  
   編輯 `src/data/qaData.js`

## 授權與免責

本工具為玩家社群輔助用途，卡牌圖像與遊戲內容版權屬原權利人所有。本倉庫僅提供工具原始碼，不提供卡牌素材的重散布授權。
